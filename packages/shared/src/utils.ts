// Math utilities for probability calculations

/**
 * Calculate Wilson score confidence interval for binomial proportion
 * More accurate than normal approximation for extreme probabilities
 */
export function wilsonCI(successes: number, n: number, confidence = 0.95): [number, number] {
  if (n === 0) return [0, 1];
  
  const p = successes / n;
  const z = confidence === 0.95 ? 1.96 : 2.576; // z-score for confidence level
  const zsq = z * z;
  
  const denominator = 1 + zsq / n;
  const center = (p + zsq / (2 * n)) / denominator;
  const margin = (z * Math.sqrt(p * (1 - p) / n + zsq / (4 * n * n))) / denominator;
  
  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin)
  ];
}

/**
 * Calculate expected value for Kalshi contract
 */
export function calculateEV(
  probability: number,
  action: "BUY_YES" | "SELL_YES" | "BUY_NO" | "SELL_NO",
  price: number
): number {
  switch (action) {
    case "BUY_YES":
      return 100 * probability - price;
    case "SELL_YES":
      return price - 100 * (1 - probability);
    case "BUY_NO":
      return 100 * (1 - probability) - price;
    case "SELL_NO":
      return price - 100 * probability;
  }
}

/**
 * Format probability as percentage
 */
export function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

/**
 * Format price in cents
 */
export function formatPrice(cents: number): string {
  return `${cents}¢`;
}

/**
 * Format edge with sign
 */
export function formatEdge(edge: number): string {
  const sign = edge >= 0 ? '+' : '';
  return `${sign}${edge.toFixed(1)}¢`;
}

/**
 * Calculate realized volatility from returns
 */
export function realizedVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * Calculate Parkinson volatility estimator (using high/low)
 */
export function parkinsonVolatility(candles: Array<{ high: number; low: number }>): number {
  if (candles.length === 0) return 0;
  
  const factor = 1 / (4 * Math.log(2));
  const sum = candles.reduce((acc, candle) => {
    const ratio = candle.high / candle.low;
    return acc + Math.pow(Math.log(ratio), 2);
  }, 0);
  
  return Math.sqrt(factor * sum / candles.length);
}

/**
 * Calculate EWMA (Exponentially Weighted Moving Average) volatility
 */
export function ewmaVolatility(returns: number[], lambda = 0.94): number {
  if (returns.length === 0) return 0;
  
  let variance = 0;
  returns.forEach((r, i) => {
    if (i === 0) {
      variance = r * r;
    } else {
      variance = lambda * variance + (1 - lambda) * r * r;
    }
  });
  
  return Math.sqrt(variance);
}

/**
 * Detect jump outliers in returns
 */
export function detectJumps(returns: number[], threshold = 3): number[] {
  const vol = realizedVolatility(returns);
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  return returns.filter(r => Math.abs(r - mean) > threshold * vol);
}

/**
 * Get time to next hour in seconds
 */
export function getSecondsToNextHour(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  
  return Math.floor((nextHour.getTime() - now.getTime()) / 1000);
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if market is for current hour
 */
export function isCurrentHourMarket(closeTime: string): boolean {
  const now = new Date();
  const close = new Date(closeTime);
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  
  return close.getTime() === nextHour.getTime();
}

function parseNumber(value?: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = parseNumber(match[1]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }
  return null;
}

function matchRange(text: string, patterns: RegExp[]): [number, number] | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && match?.[2]) {
      const low = parseNumber(match[1]);
      const high = parseNumber(match[2]);
      if (low !== null && high !== null) {
        return [low, high];
      }
    }
  }
  return null;
}

/**
 * Parse Kalshi market type and parameters from API fields and title/subtitle
 */
export function parseKalshiMarket(market: any): {
  type: "above" | "range" | null;
  strike?: number;
  rangeLow?: number;
  rangeHigh?: number;
} {
  const strikeType = market.strike_type?.toLowerCase();
  
  // Prefer API supplied strikes when available
  if (market.floor_strike !== undefined && market.cap_strike !== undefined) {
    return {
      type: "range",
      rangeLow: market.floor_strike,
      rangeHigh: market.cap_strike,
    };
  }
  
  if (
    market.floor_strike !== undefined &&
    (
      !strikeType ||
      strikeType.includes('greater') ||
      strikeType.includes('above')
    )
  ) {
    return {
      type: "above",
      strike: market.floor_strike,
    };
  }
  
  // Fallback to parsing title/subtitle
  const title = market.title?.toLowerCase() || '';
  const subtitle = market.subtitle?.toLowerCase() || '';
  const combined = `${title} ${subtitle}`.replace(/[–—]/g, '-');
  
  const rangePatterns = [
    /\$?([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)/i,
    /between\s+\$?([\d,]+(?:\.\d+)?)\s+(?:and|to)\s+\$?([\d,]+(?:\.\d+)?)/i,
    /\$?([\d,]+(?:\.\d+)?)\s+(?:to|through)\s+\$?([\d,]+(?:\.\d+)?)/i,
  ];
  
  const rangeMatch = matchRange(combined, rangePatterns);
  if (rangeMatch) {
    return {
      type: "range",
      rangeLow: rangeMatch[0],
      rangeHigh: rangeMatch[1],
    };
  }
  
  const abovePatterns = [
    /above\s+\$?([\d,]+(?:\.\d+)?)/i,
    /over\s+\$?([\d,]+(?:\.\d+)?)/i,
    /at\s+least\s+\$?([\d,]+(?:\.\d+)?)/i,
    /\$?([\d,]+(?:\.\d+)?)\s*(?:or\s+)?above/i,
    /\$?([\d,]+(?:\.\d+)?)\s*(?:or\s+)?higher/i,
  ];
  
  const strike = matchNumber(combined, abovePatterns);
  if (strike !== null) {
    return {
      type: "above",
      strike,
    };
  }
  
  return { type: null };
}
