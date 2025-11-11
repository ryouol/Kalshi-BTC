use wasm_bindgen::prelude::*;

pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Calculate Wilson score confidence interval for binomial proportion
pub fn wilson_ci(successes: u32, n: u32, confidence: f64) -> [f64; 2] {
    if n == 0 {
        return [0.0, 1.0];
    }
    
    let p = successes as f64 / n as f64;
    let z = if confidence == 0.95 {
        1.96
    } else if confidence == 0.99 {
        2.576
    } else {
        1.96 // Default to 95%
    };
    
    let z_sq = z * z;
    let n_f = n as f64;
    
    let denominator = 1.0 + z_sq / n_f;
    let center = (p + z_sq / (2.0 * n_f)) / denominator;
    let margin = (z * (p * (1.0 - p) / n_f + z_sq / (4.0 * n_f * n_f)).sqrt()) / denominator;
    
    [
        (center - margin).max(0.0),
        (center + margin).min(1.0)
    ]
}

/// Calculate standard error for binomial proportion
pub fn binomial_stderr(p: f64, n: u32) -> f64 {
    (p * (1.0 - p) / n as f64).sqrt()
}

/// Normal CDF approximation
pub fn normal_cdf(x: f64) -> f64 {
    use statrs::distribution::{Normal, ContinuousCDF};
    let normal = Normal::new(0.0, 1.0).unwrap();
    normal.cdf(x)
}

/// Inverse normal CDF (quantile function)
pub fn normal_quantile(p: f64) -> f64 {
    use statrs::distribution::{Normal, ContinuousCDF};
    let normal = Normal::new(0.0, 1.0).unwrap();
    normal.inverse_cdf(p)
}

#[wasm_bindgen]
pub struct ProgressReporter {
    total: u32,
    current: u32,
    last_reported: u32,
}

#[wasm_bindgen]
impl ProgressReporter {
    #[wasm_bindgen(constructor)]
    pub fn new(total: u32) -> ProgressReporter {
        ProgressReporter {
            total,
            current: 0,
            last_reported: 0,
        }
    }
    
    pub fn update(&mut self, current: u32) -> Option<f64> {
        self.current = current;
        let percent = (current as f64 / self.total as f64) * 100.0;
        
        // Report every 5%
        let report_threshold = self.total / 20;
        if current - self.last_reported >= report_threshold || current == self.total {
            self.last_reported = current;
            Some(percent)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_wilson_ci() {
        // Test edge cases
        let ci = wilson_ci(0, 100, 0.95);
        assert!(ci[0] == 0.0);
        assert!(ci[1] > 0.0);
        
        let ci = wilson_ci(100, 100, 0.95);
        assert!(ci[0] < 1.0);
        assert!(ci[1] == 1.0);
        
        // Test typical case
        let ci = wilson_ci(50, 100, 0.95);
        assert!(ci[0] > 0.4);
        assert!(ci[1] < 0.6);
    }
}
