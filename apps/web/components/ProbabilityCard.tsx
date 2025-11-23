'use client';

import { SimResult, KalshiMarket, formatProbability, formatPrice, formatEdge, DEFAULT_SIMULATION_PATHS } from 'shared';
import { Trophy, TrendUp, TrendDown, CircleNotch, ChartLine, Activity } from '@phosphor-icons/react';
import { SimulationCharts } from './SimulationCharts';

interface ProbabilityCardProps {
  market: KalshiMarket;
  result: SimResult | null;
  isSimulating: boolean;
  progress?: number;
}

export function ProbabilityCard({ market, result, isSimulating, progress = 0 }: ProbabilityCardProps) {
  const getTargetDescription = () => {
    if (market.strike_price) {
      return `Above $${market.strike_price.toLocaleString()}`;
    } else if (market.range_low && market.range_high) {
      return `$${market.range_low.toLocaleString()} - $${market.range_high.toLocaleString()}`;
    }
    return 'Unknown target';
  };
  
  const getEdgeRecommendation = () => {
    if (!result || !market.yes_bid || !market.yes_ask) return null;
    
    const buyYesEdge = result.fair - market.yes_ask;
    const sellYesEdge = market.yes_bid - result.fair;
    const buyNoEdge = (100 - result.fair) - (100 - market.yes_bid);
    const sellNoEdge = (100 - market.yes_ask) - (100 - result.fair);
    
    const edges = [
      { action: 'BUY_YES', edge: buyYesEdge },
      { action: 'SELL_YES', edge: sellYesEdge },
      { action: 'BUY_NO', edge: buyNoEdge },
      { action: 'SELL_NO', edge: sellNoEdge },
    ];
    
    const bestEdge = edges.reduce((best, current) => 
      current.edge > best.edge ? current : best
    );
    
    if (bestEdge.edge < 2) return null; // Min 2% edge threshold
    
    return bestEdge;
  };
  
  const edge = getEdgeRecommendation();
  const yesLabel = market.strike_price ? 'Above' : 'In Range';
  const noLabel = market.strike_price ? 'Below' : 'Outside Range';
  const yesPercent = result ? Math.round(result.p * 100) : 0;
  const noPercent = 100 - yesPercent;
  const pathsSimulated = result?.diagnostics?.n ?? DEFAULT_SIMULATION_PATHS;
  
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold mb-1">{market.title}</h3>
          <p className="text-sm text-neutral-400">{getTargetDescription()}</p>
        </div>
        <Trophy size={24} className="text-primary-500" />
      </div>
      
      {/* Probability Display */}
      {isSimulating ? (
        <div className="space-y-4">
          <div className="text-center py-8">
            <CircleNotch size={48} className="animate-spin mx-auto mb-4 text-primary-500" />
            <p className="text-lg font-medium">Running Simulations...</p>
            {progress > 0 && (
              <p className="text-sm text-neutral-400 mt-2">{progress}% complete</p>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* Main probability */}
          <div className="text-center">
            <p className="text-5xl font-bold text-primary-400">
              {formatProbability(result.p)}
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Probability of {yesLabel}
            </p>
          </div>
          
          {/* Paths + split */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-900 rounded-lg p-4 flex flex-col items-center justify-center">
              <Activity size={20} className="text-primary-500 mb-2" />
              <p className="text-3xl font-bold">{pathsSimulated.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Monte Carlo Paths</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-4">
              <p className="text-xs text-neutral-400 mb-2">Probability Split</p>
              <div className="h-3 bg-neutral-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-primary-500"
                  style={{ width: `${yesPercent}%` }}
                  aria-label={`${yesLabel} probability`}
                />
                <div
                  className="bg-neutral-600"
                  style={{ width: `${noPercent}%` }}
                  aria-label={`${noLabel} probability`}
                />
              </div>
              <div className="flex justify-between text-xs text-neutral-500 mt-2">
                <span>{yesLabel} {yesPercent}%</span>
                <span>{noLabel} {noPercent}%</span>
              </div>
            </div>
          </div>
          
          {/* Confidence interval */}
          <div className="bg-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400">95% Confidence Interval</span>
              <ChartLine size={16} className="text-neutral-500" />
            </div>
            <div className="relative h-8 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 bg-primary-600/30"
                style={{
                  left: `${result.ci[0] * 100}%`,
                  right: `${(1 - result.ci[1]) * 100}%`,
                }}
              />
              <div 
                className="absolute top-0 bottom-0 w-1 bg-primary-500"
                style={{ left: `${result.p * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-neutral-500">
              <span>{formatProbability(result.ci[0])}</span>
              <span>{formatProbability(result.ci[1])}</span>
            </div>
          </div>
          
          {/* Fair value vs Market */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-900 rounded-lg p-4">
              <p className="text-sm text-neutral-400 mb-1">Fair Value</p>
              <p className="text-2xl font-bold">{formatPrice(result.fair)}</p>
            </div>
            
            <div className="bg-neutral-900 rounded-lg p-4">
              <p className="text-sm text-neutral-400 mb-1">Market</p>
              {market.yes_bid && market.yes_ask ? (
                <div>
                  <p className="text-sm">
                    <span className="text-error-400">{formatPrice(market.yes_ask)}</span>
                    {' / '}
                    <span className="text-success-400">{formatPrice(market.yes_bid)}</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Ask / Bid</p>
                </div>
              ) : (
                <p className="text-2xl font-bold">--</p>
              )}
            </div>
          </div>
          
          {/* Edge recommendation */}
          {edge && (
            <div className={`rounded-lg p-4 border ${
              edge.edge >= 5 ? 'bg-success-950/20 border-success-900' : 'bg-warning-950/20 border-warning-900'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {edge.action.includes('BUY') ? 'Buy' : 'Sell'} {edge.action.includes('YES') ? 'YES' : 'NO'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Expected edge: {formatEdge(edge.edge)}
                  </p>
                </div>
                {edge.action.includes('BUY') ? (
                  <TrendUp size={24} className="text-success-500" />
                ) : (
                  <TrendDown size={24} className="text-error-500" />
                )}
              </div>
            </div>
          )}
          
          {result.distribution && (
            <SimulationCharts distribution={result.distribution} />
          )}
          
          {/* Model diagnostics */}
          <div className="text-xs text-neutral-500 text-center">
            {(result.diagnostics?.n ?? DEFAULT_SIMULATION_PATHS).toLocaleString()} paths simulated
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Trophy size={48} className="mx-auto mb-4 text-neutral-600" />
          <p className="text-neutral-400">Click "Run Simulation" to calculate probabilities</p>
        </div>
      )}
    </div>
  );
}
