'use client';

import { SimResult, KalshiMarket, formatPrice, formatEdge, calculateEV } from 'shared';
import { Calculator, TrendUp, TrendDown, Target } from '@phosphor-icons/react';

interface EdgeCalculatorProps {
  market: KalshiMarket;
  result: SimResult | null;
}

interface EdgeRow {
  action: string;
  actionType: 'BUY_YES' | 'SELL_YES' | 'BUY_NO' | 'SELL_NO';
  price: number;
  probability: number;
  expectedValue: number;
  isPositive: boolean;
}

export function EdgeCalculator({ market, result }: EdgeCalculatorProps) {
  if (!result || !market.yes_bid || !market.yes_ask) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edge Calculator</h3>
          <Calculator size={20} className="text-neutral-500" />
        </div>
        <div className="text-center py-8 text-neutral-500">
          <Target size={32} className="mx-auto mb-2" />
          <p className="text-sm">Run simulation to calculate edges</p>
        </div>
      </div>
    );
  }
  
  // Calculate edges for all possible actions
  const edges: EdgeRow[] = [
    {
      action: 'Buy YES',
      actionType: 'BUY_YES',
      price: market.yes_ask,
      probability: result.p,
      expectedValue: calculateEV(result.p, 'BUY_YES', market.yes_ask),
      isPositive: calculateEV(result.p, 'BUY_YES', market.yes_ask) > 0,
    },
    {
      action: 'Sell YES',
      actionType: 'SELL_YES',
      price: market.yes_bid,
      probability: result.p,
      expectedValue: calculateEV(result.p, 'SELL_YES', market.yes_bid),
      isPositive: calculateEV(result.p, 'SELL_YES', market.yes_bid) > 0,
    },
    {
      action: 'Buy NO',
      actionType: 'BUY_NO',
      price: 100 - market.yes_bid,
      probability: 1 - result.p,
      expectedValue: calculateEV(result.p, 'BUY_NO', 100 - market.yes_bid),
      isPositive: calculateEV(result.p, 'BUY_NO', 100 - market.yes_bid) > 0,
    },
    {
      action: 'Sell NO',
      actionType: 'SELL_NO',
      price: 100 - market.yes_ask,
      probability: 1 - result.p,
      expectedValue: calculateEV(result.p, 'SELL_NO', 100 - market.yes_ask),
      isPositive: calculateEV(result.p, 'SELL_NO', 100 - market.yes_ask) > 0,
    },
  ];
  
  // Sort by expected value
  edges.sort((a, b) => b.expectedValue - a.expectedValue);
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Edge Calculator</h3>
        <Calculator size={20} className="text-primary-500" />
      </div>
      
      <div className="space-y-3">
        {edges.map((edge, index) => (
          <div 
            key={edge.action}
            className={`p-3 rounded-lg border transition-all ${
              edge.isPositive 
                ? 'bg-success-950/10 border-success-900/30 hover:border-success-800/50' 
                : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {edge.actionType.includes('BUY') ? (
                  <TrendUp size={20} className={edge.isPositive ? 'text-success-500' : 'text-neutral-500'} />
                ) : (
                  <TrendDown size={20} className={edge.isPositive ? 'text-success-500' : 'text-neutral-500'} />
                )}
                
                <div>
                  <p className="font-medium">{edge.action}</p>
                  <p className="text-xs text-neutral-400">
                    @ {formatPrice(edge.price)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-bold ${edge.isPositive ? 'text-success-400' : 'text-neutral-400'}`}>
                  {formatEdge(edge.expectedValue)}
                </p>
                <p className="text-xs text-neutral-500">EV</p>
              </div>
            </div>
            
            {index === 0 && edge.isPositive && edge.expectedValue >= 2 && (
              <div className="mt-2 pt-2 border-t border-neutral-800">
                <p className="text-xs text-success-400 flex items-center">
                  <Target size={12} className="mr-1" />
                  Best opportunity
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-neutral-800">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-400">Fair Value</p>
            <p className="font-bold">{formatPrice(result.fair)}</p>
          </div>
          <div>
            <p className="text-neutral-400">Market Mid</p>
            <p className="font-bold">{formatPrice((market.yes_bid + market.yes_ask) / 2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
