'use client';

import { useState } from 'react';
import { SensitivityParams } from 'shared';
import { Sliders, ArrowsClockwise, Info } from '@phosphor-icons/react';

interface SensitivityPanelProps {
  onParamsChange: (params: SensitivityParams) => void;
  isSimulating: boolean;
}

export function SensitivityPanel({ onParamsChange, isSimulating }: SensitivityPanelProps) {
  const [params, setParams] = useState<SensitivityParams>({
    volatilityMultiplier: 1.0,
    jumpIntensityMultiplier: 1.0,
    jumpSizeMultiplier: 1.0,
  });
  
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  const handleChange = (key: keyof SensitivityParams, value: number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    onParamsChange(newParams);
  };
  
  const handleReset = () => {
    const defaultParams: SensitivityParams = {
      volatilityMultiplier: 1.0,
      jumpIntensityMultiplier: 1.0,
      jumpSizeMultiplier: 1.0,
    };
    setParams(defaultParams);
    onParamsChange(defaultParams);
  };
  
  const isModified = 
    params.volatilityMultiplier !== 1.0 ||
    params.jumpIntensityMultiplier !== 1.0 ||
    params.jumpSizeMultiplier !== 1.0;
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sensitivity Analysis</h3>
        <div className="flex items-center space-x-2">
          {isModified && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
              title="Reset to defaults"
            >
              <ArrowsClockwise size={16} className="text-neutral-400" />
            </button>
          )}
          <Sliders size={20} className="text-primary-500" />
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Volatility Multiplier */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center">
              Volatility
              <button
                onMouseEnter={() => setShowTooltip('volatility')}
                onMouseLeave={() => setShowTooltip(null)}
                className="ml-1 p-0.5 rounded hover:bg-neutral-800"
              >
                <Info size={14} className="text-neutral-500" />
              </button>
            </label>
            <span className={`text-sm font-mono ${
              params.volatilityMultiplier === 1.0 ? 'text-neutral-500' : 'text-primary-400'
            }`}>
              {(params.volatilityMultiplier * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="90"
              max="110"
              step="1"
              value={params.volatilityMultiplier * 100}
              onChange={(e) => handleChange('volatilityMultiplier', parseFloat(e.target.value) / 100)}
              disabled={isSimulating}
              className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer slider"
            />
            
            {/* Center mark */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-neutral-600 pointer-events-none" />
          </div>
          
          {showTooltip === 'volatility' && (
            <p className="text-xs text-neutral-400 mt-1">
              Adjust realized volatility by ±10% to test sensitivity
            </p>
          )}
        </div>
        
        {/* Jump Intensity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center">
              Jump Frequency
              <button
                onMouseEnter={() => setShowTooltip('jump-intensity')}
                onMouseLeave={() => setShowTooltip(null)}
                className="ml-1 p-0.5 rounded hover:bg-neutral-800"
              >
                <Info size={14} className="text-neutral-500" />
              </button>
            </label>
            <span className={`text-sm font-mono ${
              params.jumpIntensityMultiplier === 1.0 ? 'text-neutral-500' : 'text-primary-400'
            }`}>
              {(params.jumpIntensityMultiplier * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="90"
              max="110"
              step="1"
              value={params.jumpIntensityMultiplier * 100}
              onChange={(e) => handleChange('jumpIntensityMultiplier', parseFloat(e.target.value) / 100)}
              disabled={isSimulating}
              className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer slider"
            />
            
            {/* Center mark */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-neutral-600 pointer-events-none" />
          </div>
          
          {showTooltip === 'jump-intensity' && (
            <p className="text-xs text-neutral-400 mt-1">
              Adjust how often price jumps occur
            </p>
          )}
        </div>
        
        {/* Jump Size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center">
              Jump Size
              <button
                onMouseEnter={() => setShowTooltip('jump-size')}
                onMouseLeave={() => setShowTooltip(null)}
                className="ml-1 p-0.5 rounded hover:bg-neutral-800"
              >
                <Info size={14} className="text-neutral-500" />
              </button>
            </label>
            <span className={`text-sm font-mono ${
              params.jumpSizeMultiplier === 1.0 ? 'text-neutral-500' : 'text-primary-400'
            }`}>
              {(params.jumpSizeMultiplier * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="90"
              max="110"
              step="1"
              value={params.jumpSizeMultiplier * 100}
              onChange={(e) => handleChange('jumpSizeMultiplier', parseFloat(e.target.value) / 100)}
              disabled={isSimulating}
              className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer slider"
            />
            
            {/* Center mark */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-neutral-600 pointer-events-none" />
          </div>
          
          {showTooltip === 'jump-size' && (
            <p className="text-xs text-neutral-400 mt-1">
              Adjust the magnitude of price jumps
            </p>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #0ea5e9;
          cursor: pointer;
          border-radius: 50%;
          transition: all 0.2s;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: #38bdf8;
        }
        
        .slider:disabled::-webkit-slider-thumb {
          background: #525252;
          cursor: not-allowed;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #0ea5e9;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          transition: all 0.2s;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          background: #38bdf8;
        }
        
        .slider:disabled::-moz-range-thumb {
          background: #525252;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
