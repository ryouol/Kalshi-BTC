import { NextRequest, NextResponse } from 'next/server';
import { 
  CalibrationData, 
  BTCCandle, 
  HestonParams, 
  JumpParams, 
  Regime,
  realizedVolatility,
  parkinsonVolatility,
  ewmaVolatility,
  detectJumps,
  DEFAULT_HESTON_PARAMS,
  DEFAULT_JUMP_PARAMS 
} from 'shared';

// Cache for calibration results
let calibrationCache: {
  data: CalibrationData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL = 120000; // 2 minutes

// Fetch historical candles from Coinbase
async function fetchHistoricalCandles(
  product: string,
  granularity: number,
  periods: number
): Promise<BTCCandle[]> {
  const end = new Date();
  const start = new Date(end.getTime() - periods * granularity * 1000);
  
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    granularity: granularity.toString(),
  });
  
  const response = await fetch(
    `https://api.exchange.coinbase.com/products/${product}/candles?${params}`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch candles: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Coinbase returns [timestamp, low, high, open, close, volume]
  return data.map((candle: number[]) => ({
    time: candle[0] * 1000, // Convert to milliseconds
    low: candle[1],
    high: candle[2],
    open: candle[3],
    close: candle[4],
    volume: candle[5],
  })).reverse(); // Reverse to get chronological order
}

// Calculate returns from candles
function calculateReturns(candles: BTCCandle[]): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const logReturn = Math.log(candles[i].close / candles[i - 1].close);
    returns.push(logReturn);
  }
  
  return returns;
}

// Estimate jump parameters from return outliers
function estimateJumpParams(returns: number[], threshold = 3): JumpParams {
  const jumps = detectJumps(returns, threshold);
  
  if (jumps.length === 0) {
    return DEFAULT_JUMP_PARAMS;
  }
  
  // Estimate jump intensity (jumps per period)
  const lambda = jumps.length / returns.length;
  
  // Estimate jump size distribution
  const logJumps = jumps.map(j => Math.log(Math.abs(j)));
  const mu_j = logJumps.reduce((sum, j) => sum + j, 0) / logJumps.length;
  const sigma_j = Math.sqrt(
    logJumps.reduce((sum, j) => sum + Math.pow(j - mu_j, 2), 0) / (logJumps.length - 1)
  );
  
  return {
    lambda: Math.max(0.01, Math.min(1.0, lambda)), // Clamp to reasonable range
    mu_j: 0, // Assume symmetric jumps for simplicity
    sigma_j: Math.max(0.01, Math.min(0.1, sigma_j)),
    kind: 'merton',
  };
}

// Simple regime detection based on recent returns
function detectRegime(returns: number[]): { current: Regime; probabilities: [number, number] } {
  if (returns.length < 10) {
    return {
      current: 'BULL',
      probabilities: [0.5, 0.5],
    };
  }
  
  // Use recent returns for regime detection
  const recentReturns = returns.slice(-20);
  const avgReturn = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
  const vol = realizedVolatility(recentReturns);
  
  // Simple heuristic: positive average return and lower vol = bull
  const bullScore = (avgReturn > 0 ? 0.6 : 0.4) + (vol < 0.02 ? 0.2 : 0);
  const bearScore = 1 - bullScore;
  
  return {
    current: bullScore > bearScore ? 'BULL' : 'BEAR',
    probabilities: [bullScore, bearScore],
  };
}

// Calibrate Heston parameters from realized volatilities
function calibrateHestonParams(
  dailyRV: number,
  weeklyRV: number,
  intradayRV: number
): HestonParams {
  // Long-term variance is blend of daily and weekly
  const theta = 0.7 * dailyRV * dailyRV + 0.3 * weeklyRV * weeklyRV;
  
  // Mean reversion based on how quickly intraday vol reverts to daily
  const kappa = Math.abs(intradayRV - dailyRV) > 0.01 ? 3.0 : 2.0;
  
  // Vol of vol from variance clustering
  const xi = Math.min(0.5, Math.abs(intradayRV - dailyRV) / dailyRV);
  
  // Negative correlation typical for assets
  const rho = -0.5;
  
  return {
    kappa: Math.max(0.5, Math.min(5.0, kappa)),
    theta: Math.max(0.0001, Math.min(0.25, theta)),
    xi: Math.max(0.1, Math.min(1.0, xi)),
    rho: Math.max(-0.9, Math.min(-0.1, rho)),
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check cache
    if (calibrationCache.data && Date.now() - calibrationCache.timestamp < CACHE_TTL) {
      return NextResponse.json(calibrationCache.data);
    }
    
    // Fetch historical data
    const [minuteCandles, hourlyCandles, dailyCandles] = await Promise.all([
      fetchHistoricalCandles('BTC-USD', 60, 60),      // Last 60 minutes
      fetchHistoricalCandles('BTC-USD', 3600, 24),    // Last 24 hours
      fetchHistoricalCandles('BTC-USD', 86400, 7),    // Last 7 days
    ]);
    
    // Calculate returns
    const minuteReturns = calculateReturns(minuteCandles);
    const hourlyReturns = calculateReturns(hourlyCandles);
    const dailyReturns = calculateReturns(dailyCandles);
    
    // Calculate realized volatilities
    const intradayRV = ewmaVolatility(minuteReturns);
    const dailyRV = realizedVolatility(hourlyReturns);
    const weeklyRV = realizedVolatility(dailyReturns);
    
    // Alternative: use Parkinson estimator for daily vol
    const parkinsonDailyRV = parkinsonVolatility(hourlyCandles);
    
    // Blend the two estimators
    const blendedDailyRV = 0.7 * dailyRV + 0.3 * parkinsonDailyRV;
    
    // Calibrate parameters
    const hestonParams = calibrateHestonParams(blendedDailyRV, weeklyRV, intradayRV);
    const jumpParams = estimateJumpParams(minuteReturns);
    const regime = detectRegime(minuteReturns);
    
    const calibrationData: CalibrationData = {
      dailyRV: blendedDailyRV,
      weeklyRV,
      intradayRV,
      jumps: jumpParams,
      regime,
      timestamp: Date.now(),
    };
    
    // Update cache
    calibrationCache = {
      data: calibrationData,
      timestamp: Date.now(),
    };
    
    return NextResponse.json(calibrationData);
  } catch (error) {
    console.error('Calibration error:', error);
    
    // Return default parameters on error
    const defaultData: CalibrationData = {
      dailyRV: Math.sqrt(DEFAULT_HESTON_PARAMS.theta),
      weeklyRV: Math.sqrt(DEFAULT_HESTON_PARAMS.theta),
      intradayRV: Math.sqrt(DEFAULT_HESTON_PARAMS.theta),
      jumps: DEFAULT_JUMP_PARAMS,
      regime: {
        current: 'BULL',
        probabilities: [0.5, 0.5],
      },
      timestamp: Date.now(),
    };
    
    return NextResponse.json(defaultData);
  }
}
