import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { Song, PlaylistAnalysis } from '../types';

interface HomeViewProps {
  songs: Song[];
  analysis: PlaylistAnalysis | null;
  onPlay: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

const HomeView: React.FC<HomeViewProps> = ({ songs, analysis, onPlay, currentSong, isPlaying }) => {
  // Helper to generate a consistent color gradient based on string
  const getGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 40%))`;
  };

  return (
    <div className="pb-32 space-y-8 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <div className="relative w-full h-[300px] rounded-3xl overflow-hidden bg-slate-900 group">
        <div 
          className="absolute inset-0 opacity-60 transition-transform duration-1000 group-hover:scale-105"
          style={{
            background: analysis 
              ? `linear-gradient(to right bottom, ${analysis.suggestedColorFrom}, ${analysis.suggestedColorTo})` 
              : 'linear-gradient(to right bottom, #4f46e5, #9333ea)'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 p-8 z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
             <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white border border-white/20">
               {analysis ? analysis.vibe : "Your Mix"}
             </div>
             {analysis && <Sparkles size={16} className="text-yellow-300" />}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
            {analysis ? analysis.playlistName : "Serhio Tomasito Music"}
          </h1>
          <p className="text-slate-200 text-lg opacity-90 line-clamp-2">
            {analysis ? analysis.description : "Upload your local files to start your personal streaming experience."}
          </p>
          
          {songs.length > 0 && (
            <button 
              onClick={() => onPlay(songs[0])}
              className="mt-6 flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform shadow-xl shadow-white/10"
            >
              <Play fill="currentColor" size={20} />
              <span>Play All</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Quick Picks</h2>
        
        {songs.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-slate-400">Your library is empty.</p>
            <p className="text-sm text-slate-500">Go to "My Tracks" or use the sidebar to upload music.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {songs.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              
              return (
                <div 
                  key={song.id} 
                  onClick={() => onPlay(song)}
                  className="group p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 duration-300"
                >
                  <div 
                    className="aspect-square rounded-xl mb-4 relative overflow-hidden shadow-lg"
                    style={{ background: getGradient(song.title) }}
                  >
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg text-black hover:scale-105 transition-transform">
                        {isCurrent && isPlaying ? (
                          <div className="flex gap-1 h-4 items-end">
                             <div className="w-1 bg-black animate-[bounce_1s_infinite]"></div>
                             <div className="w-1 bg-black animate-[bounce_1.2s_infinite]"></div>
                          </div>
                        ) : (
                          <Play fill="currentColor" size={24} className="ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className={`font-semibold truncate mb-1 ${isCurrent ? 'text-green-400' : 'text-white'}`}>
                    {song.title}
                  </h3>
                  <p className="text-sm text-slate-400 truncate hover:underline">
                    {song.artist}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeView;