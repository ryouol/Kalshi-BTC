use rand::prelude::*;
use rand_distr::{Normal, Poisson, StandardNormal};
use crate::types::*;

/// Update regime using HMM transition matrix
pub fn update_regime(rng: &mut impl Rng, current: Regime, hmm: &HMM, dt: f64) -> Regime {
    let u: f64 = rng.gen();
    
    let transition_prob = match current {
        Regime::Bull => hmm.p[0][1] * dt, // Prob of Bull -> Bear
        Regime::Bear => hmm.p[1][0] * dt, // Prob of Bear -> Bull
    };
    
    if u < transition_prob {
        match current {
            Regime::Bull => Regime::Bear,
            Regime::Bear => Regime::Bull,
        }
    } else {
        current
    }
}

/// Simulate Heston variance using Andersen's QE scheme
pub fn simulate_heston_variance(
    rng: &mut impl Rng,
    v_current: f64,
    params: &HestonParams,
    dt: f64,
) -> f64 {
    let kappa = params.kappa;
    let theta = params.theta;
    let xi = params.xi;
    
    // QE scheme parameters
    let c1 = xi * xi * (1.0 - (-kappa * dt).exp()) / (4.0 * kappa);
    let c2 = 4.0 * kappa * (-kappa * dt).exp() / (xi * xi * (1.0 - (-kappa * dt).exp()));
    let c3 = 4.0 * kappa * theta / (xi * xi);
    
    // Non-centrality parameter
    let lambda = c2 * v_current;
    
    // Critical value for switching between methods
    let psi_c = 1.5;
    let psi = lambda / c3;
    
    let v_next = if psi <= psi_c {
        // Use exact simulation for low psi
        let m = c3;
        let beta = 2.0 / c1;
        
        // Generate chi-squared random variable
        let z: f64 = rng.sample(StandardNormal);
        let chi_sq = if m > 1.0 {
            // Use normal approximation
            let mean = lambda;
            let variance = 2.0 * lambda;
            (mean + variance.sqrt() * z).max(0.0)
        } else {
            // Use direct method
            let u: f64 = rng.gen();
            -2.0 * u.ln()
        };
        
        chi_sq / beta
    } else {
        // Use moment-matching for high psi
        let p = (psi - 1.0) / (psi + 1.0);
        let beta = (1.0 - p) / (c1 * (1.0 + p));
        let u: f64 = rng.gen();
        
        if u <= p {
            0.0
        } else {
            (1.0 - p).ln() / beta
        }
    };
    
    // Ensure variance stays positive
    v_next.max(1e-8)
}

/// Simulate price with jumps (Merton model)
pub fn simulate_price_with_jumps(
    rng: &mut impl Rng,
    s_current: f64,
    v_current: f64,
    mu: f64,
    heston: &HestonParams,
    jumps: &JumpParams,
    dt: f64,
) -> (f64, bool) {
    let sqrt_v = v_current.sqrt();
    let sqrt_dt = dt.sqrt();
    
    // Generate correlated Brownian motions
    let z1: f64 = rng.sample(StandardNormal);
    let z2: f64 = rng.sample(StandardNormal);
    
    // Correlated shocks for price
    let w1 = z1;
    let w2 = heston.rho * z1 + (1.0 - heston.rho * heston.rho).sqrt() * z2;
    
    // Jump component
    let mut jump_occurred = false;
    let jump_multiplier = if jumps.lambda > 0.0 {
        // Determine if jump occurs
        let poisson = Poisson::new(jumps.lambda * dt).unwrap();
        let n_jumps = rng.sample(poisson) as u64;
        
        if n_jumps > 0 {
            jump_occurred = true;
            let mut total_jump = 1.0;
            
            for _ in 0..n_jumps {
                // Log-normal jump size
                let normal = Normal::new(jumps.mu_j, jumps.sigma_j).unwrap();
                let log_jump: f64 = rng.sample(normal);
                total_jump *= log_jump.exp();
            }
            
            total_jump
        } else {
            1.0
        }
    } else {
        1.0
    };
    
    // Compensated drift (risk-neutral)
    let compensator = jumps.lambda * ((jumps.mu_j + 0.5 * jumps.sigma_j * jumps.sigma_j).exp() - 1.0);
    let drift = mu - 0.5 * v_current - compensator;
    
    // Apply Euler-Maruyama with jumps
    let log_return = drift * dt + sqrt_v * sqrt_dt * w1;
    let s_next = s_current * log_return.exp() * jump_multiplier;
    
    (s_next, jump_occurred)
}

/// Generate antithetic paths for variance reduction
pub fn generate_antithetic_normals(rng: &mut impl Rng, n: usize) -> (Vec<f64>, Vec<f64>) {
    let mut normals = Vec::with_capacity(n);
    let mut antithetic = Vec::with_capacity(n);
    
    for _ in 0..n {
        let z: f64 = rng.sample(StandardNormal);
        normals.push(z);
        antithetic.push(-z);
    }
    
    (normals, antithetic)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_heston_variance_positive() {
        let mut rng = rand::thread_rng();
        let params = HestonParams {
            kappa: 2.0,
            theta: 0.04,
            xi: 0.3,
            rho: -0.5,
        };
        
        let v0 = 0.04;
        let dt = 1.0 / 24.0; // 1 hour
        
        for _ in 0..100 {
            let v = simulate_heston_variance(&mut rng, v0, &params, dt);
            assert!(v > 0.0);
        }
    }
    
    #[test]
    fn test_regime_switching() {
        let mut rng = rand::thread_rng();
        let hmm = HMM {
            p: [[0.95, 0.05], [0.10, 0.90]],
            pi0: [0.7, 0.3],
        };
        
        let dt = 1.0 / 24.0;
        let mut bull_count = 0;
        let mut current = Regime::Bull;
        
        for _ in 0..1000 {
            current = update_regime(&mut rng, current, &hmm, dt);
            if matches!(current, Regime::Bull) {
                bull_count += 1;
            }
        }
        
        // Should spend more time in Bull regime
        assert!(bull_count > 500);
    }
}
