'use client';

import { useBTCPrice } from '@/lib/hooks/useBTCPrice';
import { TrendUp, TrendDown, CircleNotch, WifiSlash } from '@phosphor-icons/react';

export function LivePrice() {
  const btcState = useBTCPrice('coinbase');
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };
  
  const getStatusIcon = () => {
    switch (btcState.status) {
      case 'connecting':
        return <CircleNotch size={20} className="animate-spin text-primary-500" />;
      case 'connected':
        return <div className="h-2 w-2 bg-success-500 rounded-full animate-pulse" />;
      case 'disconnected':
      case 'error':
        return <WifiSlash size={20} className="text-error-500" />;
    }
  };
  
  const getTrendIcon = () => {
    if (!btcState.priceChange) return null;
    
    if (btcState.priceChange > 0) {
      return <TrendUp size={20} className="text-success-500" />;
    } else if (btcState.priceChange < 0) {
      return <TrendDown size={20} className="text-error-500" />;
    }
    
    return null;
  };
  
  const getChangeColor = () => {
    if (!btcState.priceChange) return 'text-neutral-400';
    
    return btcState.priceChange > 0 ? 'text-success-500' : 'text-error-500';
  };
  
  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">BTC Price</h2>
          {getStatusIcon()}
        </div>
        {getTrendIcon()}
      </div>
      
      <div className="space-y-2">
        {btcState.price ? (
          <>
            <p className="text-3xl font-bold">{formatPrice(btcState.price)}</p>
            <div className="flex items-center space-x-2">
              {btcState.priceChangePercent !== null && (
                <span className={`text-sm font-medium ${getChangeColor()}`}>
                  {formatChange(btcState.priceChangePercent)}
                </span>
              )}
              <span className="text-xs text-neutral-500">
                via {btcState.source}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="h-9 bg-neutral-800 rounded animate-pulse" />
            <p className="text-sm text-neutral-400">
              {btcState.status === 'connecting' ? 'Connecting to feed...' : 'Waiting for data...'}
            </p>
          </>
        )}
        
        {/* Progress bar showing connection status */}
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
          {btcState.status === 'connected' && (
            <div 
              className="h-full bg-primary-600 transition-all duration-1000"
              style={{ width: '100%' }}
            />
          )}
          {btcState.status === 'connecting' && (
            <div className="h-full bg-primary-600 shimmer" />
          )}
        </div>
      </div>
    </div>
  );
}
