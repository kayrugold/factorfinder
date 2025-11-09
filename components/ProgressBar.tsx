
import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md space-y-2">
        <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">{status}</span>
            <span className="text-sm font-medium text-blue-700">{progress.toFixed(0)}%</span>
        </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
