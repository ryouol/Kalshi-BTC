'use client';

import { Activity, TrendUp, TrendDown } from '@phosphor-icons/react';
import { useCalibration } from '@/lib/hooks/useCalibration';
import { formatProbability } from 'shared';

export function VolatilityCard() {
  const { calibration, isLoading } = useCalibration();
  
  const formatVol = (vol: number) => {
    // Convert to annualized percentage
    const annualized = vol * Math.sqrt(365 * 24) * 100;
    return `${annualized.toFixed(1)}%`;
  };
  
  if (isLoading || !calibration) {
    return (
      <div className="card card-hover">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Volatility</h2>
          <Activity size={20} className="text-warning-500" />
        </div>
        <div className="space-y-2">
          <div className="h-9 bg-neutral-800 rounded animate-pulse" />
          <p className="text-sm text-neutral-400">Calibrating...</p>
          <div className="flex space-x-2">
            <div className="h-6 w-16 bg-neutral-800 rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-neutral-800 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  
  const currentRegime = calibration.regime.current;
  const regimeIcon = currentRegime === 'BULL' ? (
    <TrendUp size={20} className="text-success-500" />
  ) : (
    <TrendDown size={20} className="text-error-500" />
  );
  
  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Volatility</h2>
        {regimeIcon}
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-3xl font-bold">{formatVol(calibration.dailyRV)}</p>
          <p className="text-sm text-neutral-400">Daily realized vol</p>
        </div>
        
        <div className="flex space-x-2">
          <span className="badge badge-info">
            1D: {formatVol(calibration.dailyRV)}
          </span>
          <span className="badge badge-info">
            1W: {formatVol(calibration.weeklyRV)}
          </span>
        </div>
        
        {/* Regime indicator */}
        <div className="pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Market Regime</span>
            <span className={`font-medium ${
              currentRegime === 'BULL' ? 'text-success-400' : 'text-error-400'
            }`}>
              {currentRegime}
            </span>
          </div>
          
          <div className="mt-2">
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  currentRegime === 'BULL' ? 'bg-success-600' : 'bg-error-600'
                }`}
                style={{ width: formatProbability(calibration.regime.probabilities[currentRegime === 'BULL' ? 0 : 1]) }}
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {formatProbability(calibration.regime.probabilities[currentRegime === 'BULL' ? 0 : 1])} confidence
            </p>
          </div>
        </div>
        
        {/* Jump activity */}
        {calibration.jumps.lambda > 0.1 && (
          <div className="pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Jump Activity</span>
              <span className="text-warning-400 font-medium">
                {(calibration.jumps.lambda * 60).toFixed(1)}/hour
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
