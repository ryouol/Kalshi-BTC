export interface PerformanceMetrics {
  simulationTime: number;
  pathsPerSecond: number;
  memoryUsed: number;
  cacheHitRate: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;
  
  startTimer(): void {
    this.startTime = performance.now();
  }
  
  endTimer(paths: number): PerformanceMetrics {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    const pathsPerSecond = (paths / duration) * 1000;
    
    // Get memory usage if available
    let memoryUsed = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize) {
        memoryUsed = memory.usedJSHeapSize;
      }
    }
    
    const metric: PerformanceMetrics = {
      simulationTime: duration,
      pathsPerSecond,
      memoryUsed,
      cacheHitRate: 0, // To be updated from cache
    };
    
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
    
    return metric;
  }
  
  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        simulationTime: 0,
        pathsPerSecond: 0,
        memoryUsed: 0,
        cacheHitRate: 0,
      };
    }
    
    const sum = this.metrics.reduce((acc, m) => ({
      simulationTime: acc.simulationTime + m.simulationTime,
      pathsPerSecond: acc.pathsPerSecond + m.pathsPerSecond,
      memoryUsed: acc.memoryUsed + m.memoryUsed,
      cacheHitRate: acc.cacheHitRate + m.cacheHitRate,
    }));
    
    const count = this.metrics.length;
    
    return {
      simulationTime: sum.simulationTime / count,
      pathsPerSecond: sum.pathsPerSecond / count,
      memoryUsed: sum.memoryUsed / count,
      cacheHitRate: sum.cacheHitRate / count,
    };
  }
  
  clear(): void {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
