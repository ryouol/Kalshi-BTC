import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SimInputs,
  SimResult,
  Target,
  CalibrationData,
  KalshiMarket,
  SensitivityParams,
  DEFAULT_SIMULATION_PATHS,
  DEFAULT_HESTON_PARAMS,
  DEFAULT_JUMP_PARAMS,
} from 'shared';
import { useBTCPrice } from './useBTCPrice';
import { useCalibration } from './useCalibration';
import { simulationCache } from '../cache/simCache';
import { performanceMonitor } from '../monitoring/performance';

interface SimulationState {
  isRunning: boolean;
  progress: number;
  result: SimResult | null;
  error: string | null;
}

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    progress: 0,
    result: null,
    error: null,
  });
  
  const workerRef = useRef<Worker | null>(null);
  const btcState = useBTCPrice();
  const { calibration } = useCalibration();
  
  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    worker.onmessage = (event) => {
      const { type } = event.data;
      
      switch (type) {
        case 'initialized':
          console.log('Simulation worker initialized');
          break;
          
        case 'progress':
          setState(prev => ({
            ...prev,
            progress: event.data.progress,
          }));
          break;
          
        case 'complete':
          const result = event.data.result;
          const cacheKey = event.data.cacheKey;
          
          // Cache the result if we have a cache key
          if (cacheKey && result) {
            simulationCache.set(cacheKey, result);
          }
          
          // Record performance metrics
          if (result?.diagnostics?.n) {
            const metrics = performanceMonitor.endTimer(result.diagnostics.n);
            console.log('Simulation performance:', metrics);
          }
          
          setState(prev => ({
            ...prev,
            isRunning: false,
            progress: 100,
            result,
            error: null,
          }));
          break;
          
        case 'error':
          setState(prev => ({
            ...prev,
            isRunning: false,
            progress: 0,
            error: event.data.error,
          }));
          break;
      }
    };
    
    // Initialize WASM in worker
    worker.postMessage({
      type: 'init',
      wasmPath: '/sim_wasm_bg.wasm',
    });
    
    workerRef.current = worker;
    
    return () => {
      worker.terminate();
    };
  }, []);
  
  const prepareSimInputs = useCallback((
    market: KalshiMarket,
    calibration: CalibrationData,
    currentPrice: number,
    sensitivity?: SensitivityParams
  ): SimInputs => {
    const timeToClose = (new Date(market.close_time).getTime() - Date.now()) / 1000 / 3600; // hours
    
    // Apply sensitivity multipliers if provided
    const volMultiplier = sensitivity?.volatilityMultiplier || 1.0;
    const jumpIntensityMultiplier = sensitivity?.jumpIntensityMultiplier || 1.0;
    const jumpSizeMultiplier = sensitivity?.jumpSizeMultiplier || 1.0;
    
    // Calibrated parameters with sensitivity adjustments
    const theta = Math.pow(calibration.dailyRV * volMultiplier, 2);
    const xi = 0.3; // Fixed vol of vol for now
    
    return {
      s0: currentPrice,
      t: Math.max(0.01, timeToClose), // At least 0.01 hours
      dt: 1 / 60, // 1-minute steps
      regimes: {
        BULL: {
          mu: 0.05 / 365 / 24, // 5% annual drift per hour
          heston: {
            kappa: 2.0,
            theta: theta,
            xi: xi,
            rho: -0.5,
          },
        },
        BEAR: {
          mu: -0.05 / 365 / 24, // -5% annual drift per hour
          heston: {
            kappa: 3.0, // Faster mean reversion in bear market
            theta: theta * 1.2, // Higher vol in bear
            xi: xi * 1.1,
            rho: -0.7, // Stronger negative correlation
          },
        },
      },
      hmm: {
        p: [[0.95, 0.05], [0.10, 0.90]], // Transition matrix
        pi0: calibration.regime.probabilities,
      },
      jumps: {
        lambda: calibration.jumps.lambda * jumpIntensityMultiplier,
        mu_j: calibration.jumps.mu_j,
        sigma_j: calibration.jumps.sigma_j * jumpSizeMultiplier,
        kind: 'merton',
      },
    };
  }, []);
  
  const prepareTarget = useCallback((market: KalshiMarket): Target | null => {
    console.log('prepareTarget - market:', market);
    console.log('strike_price:', market.strike_price);
    console.log('range_low:', market.range_low, 'range_high:', market.range_high);
    
    if (market.strike_price !== undefined && market.strike_price !== null) {
      const target = {
        kind: 'above' as const,
        K: market.strike_price,
        L: undefined,
        U: undefined,
      };
      console.log('Created target:', target);
      return target;
    } else if (market.range_low !== undefined && market.range_high !== undefined) {
      const target = {
        kind: 'range' as const,
        K: undefined,
        L: market.range_low,
        U: market.range_high,
      };
      console.log('Created range target:', target);
      return target;
    }
    
    console.log('No valid target found!');
    return null;
  }, []);
  
  const runSimulation = useCallback(async (
    market: KalshiMarket,
    sensitivity?: SensitivityParams,
    paths: number = DEFAULT_SIMULATION_PATHS
  ) => {
    if (!workerRef.current || !btcState.price || !calibration) {
      setState(prev => ({
        ...prev,
        error: 'Missing required data for simulation',
      }));
      return;
    }
    
    const target = prepareTarget(market);
    if (!target) {
      setState(prev => ({
        ...prev,
        error: 'Invalid market target',
      }));
      return;
    }
    
    // Check cache first
    const timeToClose = (new Date(market.close_time).getTime() - Date.now()) / 1000 / 3600;
    const cacheKey = {
      marketTicker: market.ticker,
      s0: btcState.price,
      timeToClose,
      sensitivity: sensitivity || {
        volatilityMultiplier: 1.0,
        jumpIntensityMultiplier: 1.0,
        jumpSizeMultiplier: 1.0,
      },
    };
    
    const cachedResult = simulationCache.get(cacheKey);
    if (cachedResult) {
      setState({
        isRunning: false,
        progress: 100,
        result: cachedResult,
        error: null,
      });
      return;
    }
    
    // Start performance monitoring
    performanceMonitor.startTimer();
    
    setState({
      isRunning: true,
      progress: 0,
      result: null,
      error: null,
    });
    
    const inputs = prepareSimInputs(market, calibration, btcState.price, sensitivity);
    const batchSize = Math.ceil(paths / 10); // 10 batches for progress updates
    
    // Store cache key for completion
    workerRef.current.postMessage({
      type: 'run',
      inputs,
      target,
      paths,
      batchSize,
      cacheKey, // Pass cache key to worker
    });
  }, [btcState.price, calibration, prepareSimInputs, prepareTarget]);
  
  const stopSimulation = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setState(prev => ({
        ...prev,
        isRunning: false,
        progress: 0,
      }));
    }
  }, []);
  
  return {
    ...state,
    runSimulation,
    stopSimulation,
    isReady: !!btcState.price && !!calibration,
  };
}
