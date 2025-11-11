mod models;
mod utils;
mod types;

use wasm_bindgen::prelude::*;
use web_sys::console;
use rand::prelude::*;

pub use types::*;
pub use models::*;
pub use utils::*;

// Macro for logging to browser console
macro_rules! log {
    ( $( $t:tt )* ) => {
        console::log_1(&format!( $( $t )* ).into());
    };
}

#[wasm_bindgen]
pub struct MonteCarloEngine {
    sim_inputs: SimInputs,
    rng: rand::rngs::StdRng,
}

#[wasm_bindgen]
impl MonteCarloEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(inputs_json: &str) -> Result<MonteCarloEngine, JsValue> {
        // Set panic hook for better error messages
        utils::set_panic_hook();
        
        // Parse inputs
        let sim_inputs: SimInputs = serde_json::from_str(inputs_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse inputs: {}", e)))?;
        
        // Initialize RNG with a seed for reproducibility
        use rand::SeedableRng;
        let rng = rand::rngs::StdRng::from_entropy();
        
        Ok(MonteCarloEngine { sim_inputs, rng })
    }
    
    #[wasm_bindgen]
    pub fn run_simulation(&mut self, target_json: &str, n_paths: u32) -> Result<String, JsValue> {
        let target: Target = serde_json::from_str(target_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse target: {}", e)))?;
        
        log!("Starting simulation with {} paths for target: {:?}", n_paths, target.kind);
        
        let mut hits = 0u32;
        let mut prices = Vec::with_capacity(n_paths as usize);
        
        // Run simulations
        for i in 0..n_paths {
            let final_price = self.simulate_path()?;
            prices.push(final_price);
            
            let hit = match target.kind.as_str() {
                "above" => {
                    if let Some(k) = target.K {
                        final_price > k
                    } else {
                        return Err(JsValue::from_str("Strike price K required for 'above' target"));
                    }
                },
                "range" => {
                    if let (Some(l), Some(u)) = (target.L, target.U) {
                        final_price >= l && final_price <= u
                    } else {
                        return Err(JsValue::from_str("Range bounds L and U required for 'range' target"));
                    }
                },
                _ => return Err(JsValue::from_str("Invalid target kind")),
            };
            
            if hit {
                hits += 1;
            }
            
            // Log progress every 10%
            if i > 0 && i % (n_paths / 10) == 0 {
                log!("Progress: {}%", (i * 100) / n_paths);
            }
        }
        
        // Calculate results
        let p = hits as f64 / n_paths as f64;
        let stderr = (p * (1.0 - p) / n_paths as f64).sqrt();
        
        // Wilson confidence interval
        let ci = utils::wilson_ci(hits, n_paths, 0.95);
        
        let result = SimResult {
            target,
            p,
            ci,
            fair: p * 100.0, // Convert to cents
            diagnostics: SimDiagnostics {
                stderr,
                n: n_paths,
                convergence: None, // TODO: Add convergence tracking
            },
        };
        
        // Return JSON result
        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
    }
    
    #[wasm_bindgen]
    pub fn run_batch(&mut self, target_json: &str, n_paths: u32, batch_size: u32) -> Result<js_sys::Array, JsValue> {
        let target: Target = serde_json::from_str(target_json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse target: {}", e)))?;
        
        let results = js_sys::Array::new();
        let mut total_hits = 0u32;
        let mut total_paths = 0u32;
        
        let num_batches = (n_paths + batch_size - 1) / batch_size;
        
        for batch in 0..num_batches {
            let batch_paths = if batch == num_batches - 1 {
                n_paths - batch * batch_size
            } else {
                batch_size
            };
            
            // Run batch
            let mut batch_hits = 0u32;
            for _ in 0..batch_paths {
                let final_price = self.simulate_path()?;
                
                let hit = match target.kind.as_str() {
                    "above" => final_price > target.K.unwrap(),
                    "range" => final_price >= target.L.unwrap() && final_price <= target.U.unwrap(),
                    _ => return Err(JsValue::from_str("Invalid target kind")),
                };
                
                if hit {
                    batch_hits += 1;
                }
            }
            
            total_hits += batch_hits;
            total_paths += batch_paths;
            
            // Calculate intermediate result
            let p = total_hits as f64 / total_paths as f64;
            let ci = utils::wilson_ci(total_hits, total_paths, 0.95);
            
            let intermediate = IntermediateResult {
                batch: batch + 1,
                total_paths,
                p,
                ci,
                fair: p * 100.0,
            };
            
            let result_json = serde_json::to_string(&intermediate)
                .map_err(|e| JsValue::from_str(&format!("Failed to serialize: {}", e)))?;
            
            results.push(&JsValue::from_str(&result_json));
        }
        
        Ok(results)
    }
    
    fn simulate_path(&mut self) -> Result<f64, JsValue> {
        let dt = self.sim_inputs.dt;
        let n_steps = (self.sim_inputs.t / dt).ceil() as usize;
        
        // Initialize state
        let mut s = self.sim_inputs.s0;
        let mut v = self.sim_inputs.regimes.BULL.heston.theta; // Start with long-term vol
        let mut regime = if self.rng.gen::<f64>() < self.sim_inputs.hmm.pi0[0] {
            Regime::Bull
        } else {
            Regime::Bear
        };
        
        // Simulate path
        for _ in 0..n_steps {
            // Update regime
            regime = models::update_regime(&mut self.rng, regime, &self.sim_inputs.hmm, dt);
            
            // Get current parameters
            let params = match regime {
                Regime::Bull => &self.sim_inputs.regimes.BULL,
                Regime::Bear => &self.sim_inputs.regimes.BEAR,
            };
            
            // Simulate variance (Heston)
            v = models::simulate_heston_variance(&mut self.rng, v, &params.heston, dt);
            
            // Simulate price with jumps
            let (new_s, _jump_occurred) = models::simulate_price_with_jumps(
                &mut self.rng,
                s,
                v,
                params.mu,
                &params.heston,
                &self.sim_inputs.jumps,
                dt,
            );
            
            s = new_s;
        }
        
        Ok(s)
    }
}
