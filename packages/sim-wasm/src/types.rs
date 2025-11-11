use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Regime {
    Bull,
    Bear,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HestonParams {
    pub kappa: f64,  // mean reversion speed
    pub theta: f64,  // long-term variance
    pub xi: f64,     // vol of vol
    pub rho: f64,    // correlation
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JumpParams {
    pub lambda: f64,   // jump intensity
    pub mu_j: f64,     // mean log jump size
    pub sigma_j: f64,  // std dev of log jump size
    pub kind: String,  // "merton" or "kou"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegimeParams {
    pub mu: f64,
    pub heston: HestonParams,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HMM {
    pub p: [[f64; 2]; 2],  // transition matrix
    pub pi0: [f64; 2],     // initial probabilities
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegimeSet {
    pub BULL: RegimeParams,
    pub BEAR: RegimeParams,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimInputs {
    pub s0: f64,         // current price
    pub t: f64,          // time to maturity (hours)
    pub dt: f64,         // time step
    pub regimes: RegimeSet,
    pub hmm: HMM,
    pub jumps: JumpParams,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Target {
    pub kind: String,    // "above" or "range"
    pub K: Option<f64>,  // strike for above/below
    pub L: Option<f64>,  // lower bound for range
    pub U: Option<f64>,  // upper bound for range
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimDiagnostics {
    pub stderr: f64,
    pub n: u32,
    pub convergence: Option<Vec<f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimResult {
    pub target: Target,
    pub p: f64,
    pub ci: [f64; 2],
    pub fair: f64,
    pub diagnostics: SimDiagnostics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntermediateResult {
    pub batch: u32,
    pub total_paths: u32,
    pub p: f64,
    pub ci: [f64; 2],
    pub fair: f64,
}

// Ensure types are Send + Sync for WASM
unsafe impl Send for SimInputs {}
unsafe impl Sync for SimInputs {}
unsafe impl Send for SimResult {}
unsafe impl Sync for SimResult {}
