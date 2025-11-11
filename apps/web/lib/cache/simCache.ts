import { SimResult, Target, SensitivityParams } from 'shared';

interface CacheKey {
  marketTicker: string;
  s0: number;
  timeToClose: number;
  sensitivity: SensitivityParams;
}

interface CacheEntry {
  result: SimResult;
  timestamp: number;
}

export class SimulationCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 60000; // 1 minute cache
  private maxSize = 50; // Maximum entries
  
  private generateKey(key: CacheKey): string {
    return JSON.stringify({
      ticker: key.marketTicker,
      s0: Math.round(key.s0), // Round to nearest dollar
      t: Math.round(key.timeToClose * 10) / 10, // Round to 0.1 hours
      vol: key.sensitivity.volatilityMultiplier,
      jump: key.sensitivity.jumpIntensityMultiplier,
      size: key.sensitivity.jumpSizeMultiplier,
    });
  }
  
  get(key: CacheKey): SimResult | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if entry is still valid
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }
  
  set(key: CacheKey, result: SimResult): void {
    const cacheKey = this.generateKey(key);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  stats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Could track hits/misses for real stats
    };
  }
}

// Singleton instance
export const simulationCache = new SimulationCache();
