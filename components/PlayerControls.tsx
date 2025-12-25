import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Sliders } from 'lucide-react';
import { Song, EQPreset } from '../types';

interface PlayerControlsProps {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (value: number) => void;
  onToggleEQ: () => void;
  isEQOpen: boolean;
  currentPreset: EQPreset;
}

const formatTime = (time: number) => {
  if (!time) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentSong,
  isPlaying,
  progress,
  duration,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onToggleEQ,
  isEQOpen,
  currentPreset
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 p-4 pb-6 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
          {currentSong ? (
            <>
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg flex items-center justify-center animate-pulse">
                <span className="text-xl font-bold text-white/50">♪</span>
              </div>
              <div className="overflow-hidden">
                <h4 className="text-white font-medium truncate">{currentSong.title}</h4>
                <p className="text-slate-400 text-sm truncate">{currentSong.artist}</p>
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-sm">Select a song to play</div>
          )}
        </div>

        {/* Controls & Scrubber */}
        <div className="flex flex-col items-center flex-1 max-w-2xl">
          <div className="flex items-center gap-6 mb-2">
            <button className="text-slate-400 hover:text-white transition-colors">
              <Shuffle size={18} />
            </button>
            <button onClick={onPrev} className="text-white hover:text-purple-400 transition-colors">
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button 
              onClick={onPlayPause}
              className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={onNext} className="text-white hover:text-purple-400 transition-colors">
              <SkipForward size={24} fill="currentColor" />
            </button>
            <button className="text-slate-400 hover:text-white transition-colors">
              <Repeat size={18} />
            </button>
          </div>
          
          <div className="w-full flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span>{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & EQ */}
        <div className="w-1/4 flex justify-end items-center gap-4">
          <button 
            onClick={onToggleEQ}
            className={`transition-colors ${isEQOpen || currentPreset !== 'Normal' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            title="Equalizer"
          >
            <Sliders size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <Volume2 size={20} className="text-slate-400" />
            <div className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-white rounded-full"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerControls;