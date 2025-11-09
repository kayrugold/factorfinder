
import React, { useState, useCallback, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { OutputPanel } from './components/OutputPanel';
import { ProgressBar } from './components/ProgressBar';
import { LatticePlot } from './components/LatticePlot';
import type { LogEntry, FactorResult, AppState, SearchMode, WorkerMessage } from './types';
import { FactorService } from './services/factorService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    logs: [{ type: 'info', message: 'Welcome to Factor Finder. Enter a number and start a search.' }],
    sCandidates: [],
    factors: [],
    status: 'Idle',
    progress: 0,
    isSearching: false,
    searchMode: 'sgs',
  });

  const [plotState, setPlotState] = useState<{ n: string; s: string }>({ n: '1007', s: '72' });
  
  const factorServiceRef = useRef<FactorService | null>(null);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  const addLog = useCallback((log: LogEntry) => {
    setAppState(prev => ({ ...prev, logs: [...prev.logs.slice(-100), log] }));
  }, []);

  const addSCandidates = useCallback((newCandidates: string[]) => {
    setAppState(prev => {
      const combined = new Set([...prev.sCandidates, ...newCandidates]);
      return { ...prev, sCandidates: Array.from(combined) };
    });
  }, []);
  
  const addFactor = useCallback((newFactor: FactorResult) => {
    setAppState(prev => {
        const factorExists = prev.factors.some(f => f.factor === newFactor.factor);
        if (factorExists) return prev;
        return { ...prev, factors: [...prev.factors, newFactor].sort((a,b) => BigInt(a.factor) > BigInt(b.factor) ? 1 : -1) };
    });
  }, []);

  const onWorkerMessage = useCallback((event: MessageEvent<WorkerMessage>) => {
    const data = event.data;
    switch (data.type) {
      case 'log':
        addLog({ type: 'info', message: data.message });
        break;
      case 'status':
        updateState({ status: data.message });
        break;
      case 'progress':
        updateState({ progress: data.value });
        break;
      case 's_candidate_batch':
        addSCandidates(data.candidates);
        break;
      case 'factor_found':
        addFactor({ factor: data.factor, method: data.method });
        addLog({ type: 'success', message: `Factor found by ${data.method}: ${data.factor}` });
        break;
      case 's_min_result':
        addLog({ type: 'success', message: `S_min calculated: ${data.s_min.substring(0, 80)}...` });
        if (factorServiceRef.current) {
            factorServiceRef.current.stop();
        }
        updateState({ isSearching: false, status: 'S_min found' });
        break;
      case 'complete':
        addLog({ type: 'info', message: 'Worker task complete.' });
        if (factorServiceRef.current) {
            factorServiceRef.current.stop();
        }
        updateState({ isSearching: false, progress: 100, status: 'Scan Complete' });
        break;
      case 'error':
        addLog({ type: 'error', message: data.message });
        if (factorServiceRef.current) {
            factorServiceRef.current.stop();
        }
        updateState({ isSearching: false, status: 'Error' });
        break;
    }
  }, [addLog, updateState, addSCandidates, addFactor]);

  const handleStartSearch = useCallback((params: {
    base: string;
    exponent: string;
    addend: string;
    min: string;
    max: string;
    sCandidates: string[];
    mode: SearchMode;
  }) => {
    if (appState.isSearching) return;

    setAppState(prev => ({
        ...prev,
        logs: [{ type: 'info', message: `Starting search with mode: ${params.mode.toUpperCase()}`}],
        sCandidates: params.mode === 'resolve' ? [] : prev.sCandidates,
        factors: params.mode === 'resolve' ? [] : prev.factors,
        isSearching: true,
        status: 'Initializing...',
        progress: 0,
    }));
    
    factorServiceRef.current = new FactorService(onWorkerMessage);
    factorServiceRef.current.startSearch(params);

  }, [appState.isSearching, onWorkerMessage]);

  const handleStopSearch = useCallback(() => {
    if (!appState.isSearching) return;
    if (factorServiceRef.current) {
      factorServiceRef.current.stop();
    }
    updateState({ isSearching: false, status: 'Stopped by user', progress: 0 });
    addLog({ type: 'warning', message: 'Search stopped by user.' });
  }, [appState.isSearching, addLog, updateState]);

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800 font-sans p-4 lg:p-6 flex flex-col items-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-700">Factor Finder</h1>
          <p className="text-gray-600 mt-2 text-lg">S-Augmented Search &amp; Visualization</p>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 flex flex-col gap-6">
            <ControlPanel 
              isSearching={appState.isSearching}
              onStart={handleStartSearch}
              onStop={handleStopSearch}
              sCandidates={appState.sCandidates}
              onPlotUpdate={setPlotState}
            />
             <ProgressBar progress={appState.progress} status={appState.status} />
          </div>
         
          <div className="xl:col-span-1 flex flex-col gap-6">
            <OutputPanel title="Main Log" items={appState.logs.map(log => ({ id: Math.random(), ...log }))} />
            <OutputPanel title={`S-Candidates (${appState.sCandidates.length})`} items={appState.sCandidates.map(s => ({ id: s, message: s, type: 'info' }))} />
            <OutputPanel title={`Found Factors (${appState.factors.length})`} items={appState.factors.map(f => ({ id: f.factor, message: `${f.factor} (by ${f.method})`, type: 'success' }))} />
          </div>
        </main>
        
        <LatticePlot n={plotState.n} s={plotState.s} />
      </div>
    </div>
  );
};

export default App;
