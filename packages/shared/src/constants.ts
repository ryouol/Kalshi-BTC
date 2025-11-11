// API endpoints
export const KALSHI_BASE_URL = process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2';
export const KALSHI_WS_URL = 'wss://api.elections.kalshi.com/trade-api/ws/v2';

export const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';
export const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

// Model constants
export const DEFAULT_SIMULATION_PATHS = 50000;
export const DEFAULT_TIME_STEPS = 60; // 1-minute steps for hourly predictions

// Default model parameters
export const DEFAULT_HESTON_PARAMS = {
  kappa: 2.0,    // mean reversion 2x per day
  theta: 0.04,   // 20% annualized vol squared
  xi: 0.3,       // vol of vol
  rho: -0.5,     // negative correlation typical for crypto
};

export const DEFAULT_JUMP_PARAMS = {
  lambda: 0.1,   // 0.1 jumps per hour on average
  muJ: 0,        // symmetric jumps
  sigmaJ: 0.02,  // 2% jump size std dev
  kind: 'merton' as const,
};

// UI constants
export const REFRESH_INTERVAL = 5000; // 5 seconds
export const CALIBRATION_INTERVAL = 120000; // 2 minutes

// Edge thresholds
export const MIN_EDGE_THRESHOLD = 2; // minimum 2% edge to recommend
export const HIGH_CONFIDENCE_CI_WIDTH = 5; // CI width <= 5% for high confidence

// Cache TTLs (seconds)
export const MARKET_CACHE_TTL = 30;
export const CALIBRATION_CACHE_TTL = 120;
export const PRICE_CACHE_TTL = 1;
