// Simulation Web Worker
// @ts-ignore - WASM imports
import init, { MonteCarloEngine } from '../../../../packages/sim-wasm/pkg/sim_wasm';

let engine: MonteCarloEngine | null = null;
let isInitialized = false;

// Message types
interface InitMessage {
  type: 'init';
  wasmPath: string;
}

interface RunMessage {
  type: 'run';
  inputs: any;
  target: any;
  paths: number;
  batchSize: number;
  cacheKey?: any;
}

interface StopMessage {
  type: 'stop';
}

type WorkerMessage = InitMessage | RunMessage | StopMessage;

// Initialize WASM module
async function initWasm(wasmPath: string) {
  try {
    await init(wasmPath);
    isInitialized = true;
    self.postMessage({ type: 'initialized' });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: `Failed to initialize WASM: ${error}` 
    });
  }
}

// Run simulation
async function runSimulation(inputs: any, target: any, paths: number, batchSize: number, cacheKey?: any) {
  if (!isInitialized) {
    self.postMessage({ 
      type: 'error', 
      error: 'WASM not initialized' 
    });
    return;
  }
  
  try {
    // Create engine with inputs
    engine = new MonteCarloEngine(JSON.stringify(inputs));
    
    // Run in batches for progressive updates
    const results = engine.run_batch(
      JSON.stringify(target),
      paths,
      batchSize
    );
    
    // Send intermediate results
    for (let i = 0; i < results.length; i++) {
      const result = JSON.parse(results[i] as string);
      self.postMessage({
        type: 'progress',
        result,
        progress: ((i + 1) / results.length) * 100,
      });
    }
    
    // Send final result
    const finalResult = JSON.parse(results[results.length - 1] as string);
    self.postMessage({
      type: 'complete',
      result: {
        target,
        p: finalResult.p,
        ci: finalResult.ci,
        fair: finalResult.fair,
        diagnostics: {
          stderr: Math.sqrt(finalResult.p * (1 - finalResult.p) / paths),
          n: paths,
        },
      },
      cacheKey,
    });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: `Simulation failed: ${error}` 
    });
  } finally {
    // Clean up
    if (engine) {
      engine.free();
      engine = null;
    }
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;
  
  switch (type) {
    case 'init':
      await initWasm(event.data.wasmPath);
      break;
      
    case 'run':
      const { inputs, target, paths, batchSize, cacheKey } = event.data;
      await runSimulation(inputs, target, paths, batchSize, cacheKey);
      break;
      
    case 'stop':
      if (engine) {
        engine.free();
        engine = null;
      }
      self.postMessage({ type: 'stopped' });
      break;
      
    default:
      self.postMessage({ 
        type: 'error', 
        error: `Unknown message type: ${type}` 
      });
  }
});
