import React from 'react';
import { formatBytes } from '../lib/minifier';

interface StatsPanelProps {
  originalSize: number;
  minifiedSize: number;
  gzipOriginalSize: number;
  gzipMinifiedSize: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ 
  originalSize, 
  minifiedSize, 
  gzipOriginalSize, 
  gzipMinifiedSize 
}) => {
  const savings = originalSize - minifiedSize;
  const percent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(2) : '0.00';
  
  const gzipSavings = gzipOriginalSize - gzipMinifiedSize;
  const gzipPercent = gzipOriginalSize > 0 ? ((gzipSavings / gzipOriginalSize) * 100).toFixed(2) : '0.00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Raw Size Stats */}
      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mb-1">Raw Size</span>
          <div className="flex items-baseline gap-2">
             <span className="text-gray-500 text-xs line-through">{formatBytes(originalSize)}</span>
             <span className="text-white font-mono font-bold text-lg">{formatBytes(minifiedSize)}</span>
          </div>
        </div>
        <div className="text-right">
           <div className="text-indigo-400 font-bold text-lg">{percent}%</div>
           <div className="text-gray-600 text-xs">Reduction</div>
        </div>
      </div>

      {/* Gzip Size Stats */}
      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mb-1">Gzip / Deflate</span>
          <div className="flex items-baseline gap-2">
             <span className="text-gray-500 text-xs line-through">{formatBytes(gzipOriginalSize)}</span>
             <span className="text-white font-mono font-bold text-lg">{formatBytes(gzipMinifiedSize)}</span>
          </div>
        </div>
        <div className="text-right">
           <div className="text-emerald-400 font-bold text-lg">{gzipPercent}%</div>
           <div className="text-gray-600 text-xs">Compression</div>
        </div>
      </div>
    </div>
  );
};