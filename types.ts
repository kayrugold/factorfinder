
export type SearchMode = 'trial' | 'sgs' | 'resolve' | 's_min';

export interface LogEntry {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface FactorResult {
    factor: string;
    method: string;
}

export interface AppState {
  logs: LogEntry[];
  sCandidates: string[];
  factors: FactorResult[];
  status: string;
  progress: number;
  isSearching: boolean;
  searchMode: SearchMode;
}

// Worker Communication Types
export type WorkerCommand = 
  | { command: 'start_trial', base: string, exponent: string, addend: string, max: string }
  | { command: 'start_sgs', base: string, exponent: string, addend: string, min: string, max: string }
  | { command: 'start_resolve', base: string, exponent: string, addend: string, sCandidates: string[] }
  | { command: 'start_s_min', base: string, exponent: string, addend: string };

export type WorkerMessage = 
  | { type: 'log', message: string }
  | { type: 'status', message: string }
  | { type: 'progress', value: number }
  | { type: 's_candidate_batch', candidates: string[] }
  | { type: 'factor_found', factor: string, method: string }
  | { type: 's_min_result', s_min: string }
  | { type: 'complete' }
  | { type: 'error', message: string };
