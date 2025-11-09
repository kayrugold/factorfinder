
import type { SearchMode, WorkerCommand, WorkerMessage } from '../types';

export class FactorService {
  private workers: Worker[] = [];
  private onMessage: (event: MessageEvent<WorkerMessage>) => void;
  private readonly numWorkers: number;

  constructor(onMessage: (event: MessageEvent<WorkerMessage>) => void) {
    this.onMessage = onMessage;
    // Use half of the available cores, with a minimum of 1 and max of 4 for stability
    this.numWorkers = Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 4) / 2)));
  }

  private createWorker(): Worker {
    const workerCode = `
      self.onmessage = function(e) {
        const data = e.data;
        
        // BigInt Polyfill for simple functions
        const BigIntMath = {
            sqrt: (n) => {
                if (n < 0n) throw new Error("sqrt of negative");
                if (n < 2n) return n;
                let x0 = n;
                let x1 = (n / 2n) + 1n;
                while (x1 < x0) {
                    x0 = x1;
                    x1 = (x0 + n / x0) / 2n;
                }
                return x0;
            },
            powMod: (base, exp, mod) => {
                let res = 1n;
                base %= mod;
                while (exp > 0n) {
                    if (exp % 2n === 1n) res = (res * base) % mod;
                    exp >>= 1n;
                    base = (base * base) % mod;
                }
                return res;
            }
        };

        const post = (message) => self.postMessage(message);

        switch (data.command) {
            case 'start_trial':
                runTrialDivision(data);
                break;
            case 'start_sgs':
                runSgsFilter(data);
                break;
            case 'start_resolve':
                runSasResolver(data);
                break;
            case 'start_s_min':
                // For simplicity, S_min is handled via modular exponentiation for now
                // A true streaming sqrt would be much more complex.
                runSMin(data);
                break;
        }

        function runSMin(params) {
            try {
                const { base, exponent, addend } = params;
                const N = BigInt(base) ** BigInt(exponent) + BigInt(addend);
                const two = 2n;
                const four = 4n;
                let s_min = BigIntMath.sqrt(N) * two;
                while (s_min * s_min <= four * N) {
                    s_min += 1n;
                }
                post({ type: 's_min_result', s_min: s_min.toString() });
            } catch (e) {
                post({ type: 'error', message: "Failed to calculate N for S_min. Number is likely too large for this method." });
            }
        }

        function runTrialDivision(params) {
            const { base, exponent, addend, max } = params;
            const N = BigInt(base) ** BigInt(exponent) + BigInt(addend);
            const maxDivisor = BigInt(max);
            
            post({type: 'status', message: 'Trial division running...'});
            for (let i = 2n; i <= maxDivisor; i++) {
                if (N % i === 0n) {
                    post({ type: 'factor_found', factor: i.toString(), method: 'Trial Division' });
                }
                if (i % 1000n === 0n) { // Post progress
                    post({ type: 'progress', value: Number(i * 100n / maxDivisor) });
                }
            }
            post({ type: 'complete' });
        }

        function runSgsFilter(params) {
            const { base, exponent, addend, min, max } = params;
            const min_S = BigInt(min);
            const max_S = BigInt(max);
            const N = BigInt(base) ** BigInt(exponent) + BigInt(addend);
            const fourN = 4n * N;

            // Small primes for Legendre symbol check
            const QR_PRIMES = [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n];
            
            const n_mods = {};
            QR_PRIMES.forEach(p => { n_mods[p] = N % p; });
            
            post({type: 'status', message: 'SGS Filter running...'});
            let candidates = [];
            const range = max_S - min_S;

            for (let S = min_S; S <= max_S; S++) {
                const s_sq = S * S;
                if (s_sq <= fourN) continue;

                let passes = true;
                for (const p of QR_PRIMES) {
                    const d_mod_p = (s_sq - (4n * n_mods[p])) % p;
                    const legendre = BigIntMath.powMod(d_mod_p, (p - 1n) / 2n, p);
                    if (legendre === p - 1n) {
                        passes = false;
                        break;
                    }
                }

                if (passes) {
                    candidates.push(S.toString());
                    if (candidates.length >= 100) {
                        post({ type: 's_candidate_batch', candidates });
                        candidates = [];
                    }
                }
                
                if (S % 1000n === 0n && range > 0n) {
                    post({ type: 'progress', value: Number((S - min_S) * 100n / range) });
                }
            }
            if (candidates.length > 0) {
                post({ type: 's_candidate_batch', candidates });
            }
            post({ type: 'complete' });
        }

        function runSasResolver(params) {
            const { base, exponent, addend, sCandidates } = params;
            const N = BigInt(base) ** BigInt(exponent) + BigInt(addend);
            const fourN = 4n * N;
            
            post({type: 'status', message: 'SAS Resolver running...'});
            const total = sCandidates.length;

            sCandidates.forEach((s_str, index) => {
                const S = BigInt(s_str);
                const D_sq = S * S - fourN;
                if (D_sq >= 0n) {
                    const D = BigIntMath.sqrt(D_sq);
                    if (D * D === D_sq) {
                        const sum = S + D;
                        if (sum % 2n === 0n) {
                           const factor = sum / 2n;
                           if (N % factor === 0n) {
                             post({ type: 'factor_found', factor: factor.toString(), method: 'SAS' });
                             const otherFactor = N / factor;
                             post({ type: 'factor_found', factor: otherFactor.toString(), method: 'SAS' });
                           }
                        }
                    }
                }
                post({ type: 'progress', value: (index + 1) / total * 100 });
            });
            post({ type: 'complete' });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = this.onMessage;
    worker.onerror = (e) => this.onMessage({ data: { type: 'error', message: e.message } } as MessageEvent);
    return worker;
  }

  startSearch(params: {
    base: string;
    exponent: string;
    addend: string;
    min: string;
    max: string;
    sCandidates: string[];
    mode: SearchMode;
  }) {
    this.stop(); // Ensure no old workers are running

    // Single worker for these tasks for now
    const worker = this.createWorker();
    this.workers.push(worker);

    let command: WorkerCommand;
    switch (params.mode) {
      case 'trial':
        command = { command: 'start_trial', base: params.base, exponent: params.exponent, addend: params.addend, max: params.max };
        break;
      case 'sgs':
        command = { command: 'start_sgs', base: params.base, exponent: params.exponent, addend: params.addend, min: params.min, max: params.max };
        break;
      case 'resolve':
        command = { command: 'start_resolve', base: params.base, exponent: params.exponent, addend: params.addend, sCandidates: params.sCandidates };
        break;
      case 's_min':
        command = { command: 'start_s_min', base: params.base, exponent: params.exponent, addend: params.addend };
        break;
      default:
        this.onMessage({ data: { type: 'error', message: 'Invalid search mode' } } as MessageEvent);
        return;
    }
    
    worker.postMessage(command);
  }

  stop() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
  }
}
