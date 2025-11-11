# Kalshi BTC Price Predictor

A sophisticated web application that provides real-time probability calculations for Kalshi's hourly Bitcoin betting markets using advanced Monte Carlo simulations.

## Features

- **Real-time BTC Price Feeds**: WebSocket connections to Coinbase and Binance
- **Advanced Financial Models**:
  - Heston stochastic volatility model
  - Merton jump diffusion for price spikes
  - 2-state HMM regime switching (Bull/Bear markets)
- **50,000 Path Monte Carlo Simulations**: High-performance Rust/WebAssembly engine
- **Automated Calibration**: Real-time parameter estimation from historical volatility
- **Edge Calculator**: Expected value calculations for all betting positions
- **Sensitivity Analysis**: Test different volatility and jump scenarios
- **Performance Optimized**: Caching, progressive updates, and WebWorker isolation
- **Beautiful Dark UI**: Modern, responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React
- **Compute Engine**: Rust compiled to WebAssembly
- **Styling**: Tailwind CSS with custom dark theme
- **Icons**: Phosphor Icons
- **Data**: WebSocket feeds, Kalshi REST/WS APIs
- **Deployment**: Vercel (serverless + edge runtime)
- **State Management**: SWR for data fetching and caching

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Rust toolchain (for building WASM)
- Kalshi API credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kalshi-btc-predictor.git
cd kalshi-btc-predictor
```

2. Install dependencies:
```bash
pnpm install
```

3. Install Rust and wasm-pack:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
```

4. Build the WASM module:
```bash
pnpm run build:wasm
```

5. Set up environment variables:
```bash
cp apps/web/env.example apps/web/.env.local
# Edit .env.local with your Kalshi API credentials
```

6. Run the development server:
```bash
pnpm dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/kalshi-btc-predictor)

Or deploy manually:

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `KALSHI_API_KEY`
   - `KALSHI_API_SECRET`
4. Deploy!

## Model Details

### Heston Stochastic Volatility
- Mean-reverting variance process
- Captures volatility clustering
- Negative correlation between price and volatility

### Merton Jump Diffusion
- Models sudden price movements
- Log-normal jump sizes
- Poisson jump intensity calibrated from outliers

### Regime Switching (HMM)
- Bull/Bear market states
- Different parameters per regime
- Transition probabilities from historical data

### Calibration
- Daily & weekly realized volatility
- Jump detection from return outliers
- Regime detection using EM algorithm

## API Routes

- `/api/kalshi/markets` - Discover BTC hourly markets
- `/api/kalshi/market/[ticker]` - Get market details & orderbook
- `/api/calibrate` - Compute model parameters from historical data

## Performance

- 50,000 paths typically complete in < 2 seconds
- Progressive updates every 10% for responsive UI
- Result caching with 1-minute TTL
- WebWorker isolation prevents UI blocking

## Disclaimer

This tool provides probabilistic analysis based on historical data and mathematical models. Results are not investment advice. Markets can be unpredictable and past performance does not guarantee future results. Always do your own research and never bet more than you can afford to lose.

## License

MIT
