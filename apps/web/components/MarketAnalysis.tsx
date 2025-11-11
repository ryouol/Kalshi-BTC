'use client';

import { useState } from 'react';
import { KalshiMarket, SensitivityParams, DEFAULT_SIMULATION_PATHS } from 'shared';
import { ProbabilityCard } from './ProbabilityCard';
import { EdgeCalculator } from './EdgeCalculator';
import { SensitivityPanel } from './SensitivityPanel';
import { useSimulation } from '@/lib/hooks/useSimulation';
import { useKalshiMarket } from '@/lib/hooks/useKalshiMarkets';
import { Play, Stop, Warning } from '@phosphor-icons/react';

interface MarketAnalysisProps {
  market: KalshiMarket | null;
}

export function MarketAnalysis({ market }: MarketAnalysisProps) {
  const [sensitivity, setSensitivity] = useState<SensitivityParams>({
    volatilityMultiplier: 1.0,
    jumpIntensityMultiplier: 1.0,
    jumpSizeMultiplier: 1.0,
  });
  
  const { isRunning, progress, result, error, runSimulation, stopSimulation, isReady } = useSimulation();
  const { orderbook } = useKalshiMarket(market?.ticker || null);
  
  if (!market) {
    return (
      <div className="card text-center py-12">
        <p className="text-neutral-400">Select a market to analyze</p>
      </div>
    );
  }
  
  const handleRunSimulation = () => {
    console.log('MarketAnalysis - Running simulation with market:', market);
    runSimulation(market, sensitivity);
  };
  
  const marketWithOrderbook = orderbook ? {
    ...market,
    yes_bid: orderbook.yes.bids[0]?.price,
    yes_ask: orderbook.yes.asks[0]?.price,
    no_bid: orderbook.no.bids[0]?.price,
    no_ask: orderbook.no.asks[0]?.price,
  } : market;
  
  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="card bg-primary-950/20 border-primary-900/50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">Monte Carlo Analysis</h2>
            <p className="text-sm text-neutral-400">
              {DEFAULT_SIMULATION_PATHS.toLocaleString()} paths with advanced models
            </p>
          </div>
          
          <button
            onClick={isRunning ? stopSimulation : handleRunSimulation}
            disabled={!isReady}
            className={`button-primary flex items-center space-x-2 ${
              isRunning ? 'bg-error-600 hover:bg-error-700' : ''
            }`}
          >
            {isRunning ? (
              <>
                <Stop size={20} weight="fill" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play size={20} weight="fill" />
                <span>Run Simulation</span>
              </>
            )}
          </button>
        </div>
        
        {!isReady && (
          <div className="mt-4 p-3 bg-warning-950/20 border border-warning-900/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <Warning size={16} className="text-warning-500 mt-0.5" />
              <p className="text-sm text-warning-400">
                Waiting for BTC price and calibration data...
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-error-950/20 border border-error-900/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <Warning size={16} className="text-error-500 mt-0.5" />
              <p className="text-sm text-error-400">{error}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Probability Card */}
        <ProbabilityCard
          market={marketWithOrderbook}
          result={result}
          isSimulating={isRunning}
          progress={progress}
        />
        
        {/* Edge Calculator */}
        <EdgeCalculator
          market={marketWithOrderbook}
          result={result}
        />
      </div>
      
      {/* Sensitivity Panel */}
      <SensitivityPanel
        onParamsChange={setSensitivity}
        isSimulating={isRunning}
      />
      
      {/* Disclaimer */}
      <div className="text-xs text-neutral-500 text-center p-4 border-t border-neutral-800">
        <p>
          This tool provides probabilistic analysis based on historical data and mathematical models. 
          Results are not investment advice. Markets can be unpredictable and past performance 
          does not guarantee future results. Always do your own research.
        </p>
      </div>
    </div>
  );
}
