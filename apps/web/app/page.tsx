'use client';

import { useState, useEffect } from 'react';
import { formatTimeRemaining, getSecondsToNextHour } from 'shared';
import { Clock, Activity } from '@phosphor-icons/react';
import { LivePrice } from '@/components/LivePrice';
import { MarketList } from '@/components/MarketList';
import { VolatilityCard } from '@/components/VolatilityCard';
import { MarketAnalysis } from '@/components/MarketAnalysis';
import { useKalshiMarkets } from '@/lib/hooks/useKalshiMarkets';

export default function Home() {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const { markets, selectedMarket, setSelectedMarket, isLoading } = useKalshiMarkets(true);

  useEffect(() => {
    // Set initial time on client side only
    setTimeRemaining(getSecondsToNextHour());
    
    const timer = setInterval(() => {
      setTimeRemaining(getSecondsToNextHour());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-4">
          BTC Price Predictor
        </h1>
        <p className="text-xl text-neutral-400">
          Monte Carlo simulations for Kalshi Bitcoin betting markets
        </p>
      </div>

      {/* Time to next hour */}
      <div className="flex justify-center mb-8">
        <div className="card flex items-center space-x-3 animate-slide-up">
          <Clock size={24} className="text-primary-500" />
          <div>
            <p className="text-sm text-neutral-400">Next market closes in</p>
            <p className="text-2xl font-bold font-mono">{timeRemaining !== null ? formatTimeRemaining(timeRemaining) : '--:--'}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BTC Price Card */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <LivePrice />
        </div>

        {/* Volatility Card */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <VolatilityCard />
        </div>

        {/* Markets Card */}
        <div className="card card-hover animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Markets</h2>
            <div className="h-2 w-2 bg-success-500 rounded-full animate-pulse" />
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold">{markets.length}</p>
            <p className="text-sm text-neutral-400">
              {isLoading ? 'Loading...' : 'BTC hourly markets'}
            </p>
          </div>
        </div>
      </div>

      {/* Markets Section */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold mb-6">Today's BTC Markets</h2>
          <MarketList
            markets={markets}
            selectedMarket={selectedMarket}
            onSelectMarket={setSelectedMarket}
            isLoading={isLoading}
          />
        </div>
        
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Analysis</h2>
          <MarketAnalysis 
            market={markets.find(m => m.ticker === selectedMarket) || null}
          />
        </div>
      </div>
    </main>
  );
}
