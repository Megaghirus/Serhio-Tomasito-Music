import React from 'react';
import { Play, Music, Trash2, Cloud, HardDrive } from 'lucide-react';
import { Song } from '../types';

interface SongListProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  isAdmin: boolean;
  onPlay: (song: Song) => void;
  onRemove: (id: string) => void;
}

const SongList: React.FC<SongListProps> = ({ songs, currentSong, isPlaying, isAdmin, onPlay, onRemove }) => {
  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
        <Music size={48} className="mb-4 opacity-50" />
        <p>No songs uploaded yet.</p>
        {isAdmin && <p className="text-sm mt-1">Use the upload button or add a link.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-32">
      {songs.map((song, index) => {
        const isCurrent = currentSong?.id === song.id;
        
        return (
          <div 
            key={song.id}
            className={`group flex items-center p-3 rounded-lg transition-all cursor-pointer ${
              isCurrent 
                ? 'bg-white/10 border border-white/5 shadow-lg' 
                : 'hover:bg-white/5 border border-transparent'
            }`}
            onClick={() => onPlay(song)}
          >
            <div className="w-10 text-center text-slate-500 text-sm font-medium mr-2">
              {isCurrent && isPlaying ? (
                <div className="flex gap-0.5 justify-center h-4 items-end">
                  <div className="w-1 bg-green-400 animate-[bounce_1s_infinite]"></div>
                  <div className="w-1 bg-green-400 animate-[bounce_1.2s_infinite]"></div>
                  <div className="w-1 bg-green-400 animate-[bounce_0.8s_infinite]"></div>
                </div>
              ) : (
                <span className="group-hover:hidden">{index + 1}</span>
              )}
              <span className={`hidden group-hover:block ${isCurrent ? 'hidden' : ''}`}>
                <Play size={16} className="mx-auto text-white" />
              </span>
            </div>

            {/* Icon indicating Cloud vs Local */}
            <div className="mr-3 text-slate-500">
               {song.isCloud ? (
                 <Cloud size={16} className="text-blue-400/70" title="Online Link" />
               ) : (
                 <HardDrive size={16} className="text-orange-400/70" title="Local File" />
               )}
            </div>

            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate ${isCurrent ? 'text-green-400' : 'text-white'}`}>
                {song.title}
              </div>
              <div className="text-sm text-slate-400 truncate">
                {song.artist}
              </div>
            </div>

            <div className="text-slate-500 text-sm mr-4 hidden md:block">
               {song.isCloud ? "Online" : "Local"}
            </div>

            {/* ADMIN DELETE BUTTON - Enabled for ALL songs now */}
            {isAdmin && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Simple confirm for cloud songs to prevent accidents
                  if (song.isCloud && !window.confirm(`Delete online track "${song.title}" from list?`)) {
                    return;
                  }
                  onRemove(song.id);
                }}
                className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove Track"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SongList;