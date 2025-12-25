import React from 'react';
import { Sliders } from 'lucide-react';
import { EQPreset } from '../types';

interface EQPanelProps {
  isOpen: boolean;
  currentPreset: EQPreset;
  onSelectPreset: (preset: EQPreset) => void;
  onClose: () => void;
}

const PRESETS: EQPreset[] = ['Normal', 'Rock', 'Pop', 'Classical', 'Jazz', 'Bass'];

const EQPanel: React.FC<EQPanelProps> = ({ isOpen, currentPreset, onSelectPreset, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-24 right-4 md:right-20 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-48">
        <div className="flex items-center gap-2 mb-4 text-white border-b border-white/10 pb-2">
          <Sliders size={16} className="text-indigo-400" />
          <h3 className="font-bold text-sm">Audio FX</h3>
        </div>
        
        <div className="space-y-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onSelectPreset(preset)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                currentPreset === preset 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{preset}</span>
              {currentPreset === preset && (
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Click outside backdrop - optional if we want strict modal behavior */}
      <div className="fixed inset-0 z-[-1]" onClick={onClose}></div>
    </div>
  );
};

export default EQPanel;