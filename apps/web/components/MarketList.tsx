'use client';

import { KalshiMarket, formatPrice, formatTimeRemaining, getSecondsToNextHour } from 'shared';
import { Trophy, Clock, ChartBar, CaretRight } from '@phosphor-icons/react';

interface MarketListProps {
  markets: KalshiMarket[];
  selectedMarket: string | null;
  onSelectMarket: (ticker: string) => void;
  isLoading: boolean;
}

export function MarketList({ markets, selectedMarket, onSelectMarket, isLoading }: MarketListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse">
            <div className="h-5 bg-neutral-800 rounded w-3/4 mb-2" />
            <div className="h-4 bg-neutral-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  
  if (markets.length === 0) {
    return (
      <div className="card text-center py-12">
        <Trophy size={48} className="mx-auto mb-4 text-neutral-600" />
        <p className="text-neutral-400">No active BTC markets found</p>
        <p className="text-sm text-neutral-500 mt-2">Markets refresh every hour</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {markets.map((market) => {
        const isSelected = market.ticker === selectedMarket;
        const hasOrderbook = market.yes_bid && market.yes_ask;
        const midPrice = hasOrderbook ? (market.yes_bid! + market.yes_ask!) / 2 : null;
        
        return (
          <button
            key={market.ticker}
            onClick={() => onSelectMarket(market.ticker)}
            className={`card w-full text-left transition-all ${
              isSelected 
                ? 'ring-2 ring-primary-500 bg-primary-950/20' 
                : 'hover:bg-neutral-900/70'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-1 flex items-center">
                  {market.title}
                  {isSelected && <CaretRight size={20} className="ml-2 text-primary-500" />}
                </h3>
                
                {market.subtitle && (
                  <p className="text-sm text-neutral-400 mb-2">{market.subtitle}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Clock size={16} className="text-neutral-500" />
                    <span className="text-neutral-400">
                      Closes in {formatTimeRemaining(
                        Math.floor((new Date(market.close_time).getTime() - Date.now()) / 1000)
                      )}
                    </span>
                  </div>
                  
                  {market.volume && (
                    <div className="flex items-center space-x-1">
                      <ChartBar size={16} className="text-neutral-500" />
                      <span className="text-neutral-400">
                        {market.volume.toLocaleString()} vol
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {hasOrderbook && (
                <div className="ml-4 text-right">
                  <p className="text-2xl font-bold">{formatPrice(midPrice!)}</p>
                  <div className="flex space-x-2 text-xs">
                    <span className="text-error-400">
                      Ask {formatPrice(market.yes_ask!)}
                    </span>
                    <span className="text-success-400">
                      Bid {formatPrice(market.yes_bid!)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Market type badge */}
            <div className="mt-3 flex items-center space-x-2">
              {market.strike_price && (
                <span className="badge badge-info">
                  Above ${market.strike_price.toLocaleString()}
                </span>
              )}
              {market.range_low && market.range_high && (
                <span className="badge badge-info">
                  ${market.range_low.toLocaleString()} - ${market.range_high.toLocaleString()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
