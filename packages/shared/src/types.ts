// Regime types
export type Regime = "BULL" | "BEAR";

// Model parameters
export interface HestonParams {
  kappa: number;  // mean reversion speed
  theta: number;  // long-term variance
  xi: number;     // vol of vol
  rho: number;    // correlation between price and variance
}

export interface JumpParams {
  lambda: number;   // jump intensity (jumps per unit time)
  mu_j: number;     // mean of log jump size
  sigma_j: number;  // std dev of log jump size
  kind: "merton" | "kou";
}

export interface RegimeParams {
  mu: number;  // drift
  heston: HestonParams;
}

export interface HMM {
  p: [[number, number], [number, number]];   // transition matrix
  pi0: [number, number];                     // initial state probabilities
}

// Simulation inputs
export interface SimInputs {
  s0: number;     // current price
  t: number;      // time to maturity (hours)
  dt: number;     // time step size
  regimes: {
    BULL: RegimeParams;
    BEAR: RegimeParams;
  };
  hmm: HMM;
  jumps: JumpParams;
}

// Target types for Kalshi markets
export interface Target {
  kind: "above" | "range";
  K?: number;    // strike for above/below
  L?: number;    // lower bound for range
  U?: number;    // upper bound for range
}

// Simulation results
export interface PathPoint {
  t: number;       // hours from start
  price: number;   // BTC price along the path
}

export interface PathSample {
  id: number;            // path identifier
  points: PathPoint[];   // sampled path points
}

export interface HistogramBin {
  price: number;        // representative price for the bucket
  probability: number;  // probability mass in this bucket
}

export interface SimulationDistribution {
  min: number;
  max: number;
  mean: number;
  stddev: number;
  histogram: HistogramBin[];
  samples: PathSample[];
}

export interface SimResult {
  target: Target;
  p: number;                    // probability
  ci: [number, number];         // 95% confidence interval
  fair: number;                 // fair value in cents
  diagnostics: {
    stderr: number;
    n: number;                  // number of paths
    convergence?: number[];     // convergence history
  };
  distribution?: SimulationDistribution;
}

// Kalshi market types
export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  open_time: string;
  close_time: string;
  expiration_time: string;
  status: "open" | "closed" | "settled";
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  volume?: number;
  // Raw Kalshi API fields
  floor_strike?: number;
  cap_strike?: number;
  strike_type?: string;
  // Parsed fields
  strike_price?: number;  // for above/below markets
  range_low?: number;     // for range markets
  range_high?: number;    // for range markets
}

export interface KalshiOrderBook {
  ticker: string;
  yes: {
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
  };
  no: {
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
  };
  timestamp: number;
}

// BTC price data
export interface BTCPrice {
  price: number;
  timestamp: number;
  source: "coinbase" | "binance";
}

export interface BTCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Calibration types
export interface CalibrationData {
  dailyRV: number;    // daily realized volatility
  weeklyRV: number;   // weekly realized volatility
  intradayRV: number; // current intraday volatility
  jumps: {
    lambda: number;
    mu_j: number;
    sigma_j: number;
  };
  regime: {
    current: Regime;
    probabilities: [number, number];  // [bull, bear]
  };
  timestamp: number;
}

// Edge calculation
export interface EdgeCalculation {
  market: KalshiMarket;
  simResult: SimResult;
  edges: {
    buyYes: number;   // expected value of buying YES
    sellYes: number;  // expected value of selling YES
    buyNo: number;    // expected value of buying NO
    sellNo: number;   // expected value of selling NO
  };
  recommendation?: "BUY_YES" | "SELL_YES" | "BUY_NO" | "SELL_NO" | "NO_EDGE";
}

// UI state types
export interface SimulationState {
  isRunning: boolean;
  progress: number;  // 0-100
  currentPaths: number;
  totalPaths: number;
  error?: string;
}

export interface SensitivityParams {
  volatilityMultiplier: number;  // 0.9 to 1.1
  jumpIntensityMultiplier: number;
  jumpSizeMultiplier: number;
}

// WebSocket message types
export interface WSMessage {
  type: "price" | "orderbook" | "trade" | "error";
  data: any;
  timestamp: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  timestamp: number;
}
