
import React, { useState, useEffect } from 'react';
import type { SearchMode } from '../types';

interface ControlPanelProps {
  isSearching: boolean;
  onStart: (params: {
    base: string;
    exponent: string;
    addend: string;
    min: string;
    max: string;
    sCandidates: string[];
    mode: SearchMode;
  }) => void;
  onStop: () => void;
  sCandidates: string[];
  onPlotUpdate: (state: { n: string, s: string }) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ isSearching, onStart, onStop, sCandidates, onPlotUpdate }) => {
  const [base, setBase] = useState('10');
  const [exponent, setExponent] = useState('3');
  const [addend, setAddend] = useState('729'); // N = 1729
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('2000');
  const [mode, setMode] = useState<SearchMode>('sgs');
  const [sCandidateInput, setSCandidateInput] = useState('');
  
  const [plotN, setPlotN] = useState('1007');
  const [plotS, setPlotS] = useState('72');

  useEffect(() => {
    setSCandidateInput(sCandidates.join('\n'));
  }, [sCandidates]);

  const handleStart = () => {
    onStart({
      base,
      exponent,
      addend,
      min,
      max,
      sCandidates: sCandidateInput.split('\n').filter(s => s.trim() !== ''),
      mode,
    });
  };
  
  const handlePlotUpdate = () => {
    try {
        BigInt(plotN);
        BigInt(plotS);
        onPlotUpdate({ n: plotN, s: plotS });
    } catch {
        alert("Invalid number for N or S in plot input.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Number to Factor (a^b + c)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input type="text" value={base} onChange={e => setBase(e.target.value)} placeholder="Base (a)" className="p-2 border rounded-md bg-gray-50" />
          <input type="text" value={exponent} onChange={e => setExponent(e.target.value)} placeholder="Exponent (b)" className="p-2 border rounded-md bg-gray-50" />
          <input type="text" value={addend} onChange={e => setAddend(e.target.value)} placeholder="Addend (c)" className="p-2 border rounded-md bg-gray-50" />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Search Mode</h3>
        <div className="flex flex-wrap gap-4">
          <RadioOption id="mode-s_min" name="mode" value="s_min" checked={mode === 's_min'} onChange={() => setMode('s_min')} label="1. Find S_min (Streaming √N)" />
          <RadioOption id="mode-trial" name="mode" value="trial" checked={mode === 'trial'} onChange={() => setMode('trial')} label="Trial Division" />
          <RadioOption id="mode-sgs" name="mode" value="sgs" checked={mode === 'sgs'} onChange={() => setMode('sgs')} label="2. SGS Filter" />
          <RadioOption id="mode-resolve" name="mode" value="resolve" checked={mode === 'resolve'} onChange={() => setMode('resolve')} label="3. SAS Resolver" />
        </div>
      </div>

      <div className={mode === 'resolve' ? 'hidden' : ''}>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Search Range</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" value={min} onChange={e => setMin(e.target.value)} placeholder="Min Limit" className="p-2 border rounded-md bg-gray-50" />
          <input type="text" value={max} onChange={e => setMax(e.target.value)} placeholder="Max Limit" className="p-2 border rounded-md bg-gray-50" />
        </div>
      </div>
      
      <div className={mode !== 'resolve' ? 'hidden' : ''}>
        <h3 className="text-xl font-bold text-gray-800 mb-2">S-Candidates to Resolve</h3>
        <textarea
          value={sCandidateInput}
          onChange={e => setSCandidateInput(e.target.value)}
          placeholder="Paste S-Candidates here, one per line."
          className="w-full h-32 p-2 border rounded-md bg-gray-50 font-mono text-sm"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleStart}
          disabled={isSearching}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isSearching ? 'Searching...' : 'Start Search'}
        </button>
        <button
          onClick={onStop}
          disabled={!isSearching}
          className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
        >
          Stop
        </button>
      </div>

      <div className="pt-4 border-t">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Lattice Plotter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <input type="text" value={plotN} onChange={e => setPlotN(e.target.value)} placeholder="Number (N)" className="p-2 border rounded-md bg-gray-50" />
            <input type="text" value={plotS} onChange={e => setPlotS(e.target.value)} placeholder="Sum (S)" className="p-2 border rounded-md bg-gray-50" />
            <button onClick={handlePlotUpdate} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 transition-colors">
                Update Plot
            </button>
        </div>
      </div>

    </div>
  );
};

const RadioOption: React.FC<{id: string, name:string, value: string, checked: boolean, onChange: () => void, label: string}> = ({id, name, value, checked, onChange, label}) => (
    <div className="flex items-center">
        <input type="radio" id={id} name={name} value={value} checked={checked} onChange={onChange} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
        <label htmlFor={id} className="ml-2 block text-sm font-medium text-gray-700">{label}</label>
    </div>
);
