import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, Menu, ExternalLink, Lock, Upload, CheckCircle, Music, Cloud, Link as LinkIcon, Wifi, WifiOff } from 'lucide-react';
import { Song, PlaylistAnalysis, View, EQPreset } from './types';
import PlayerControls from './components/PlayerControls';
import SongList from './components/SongList';
import Visualizer from './components/Visualizer';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import AdminLoginModal from './components/AdminLoginModal';
import EQPanel from './components/EQPanel';
import { analyzePlaylistVibe } from './services/geminiService';
import { subscribeToLibrary, addSongToLibrary, removeSongFromLibrary, isLiveMode } from './services/db';

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analysis, setAnalysis] = useState<PlaylistAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentView, setCurrentView] = useState<View>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  
  // Audio & EQ State
  const [eqOpen, setEqOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<EQPreset>('Normal');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showAdminToast, setShowAdminToast] = useState(false);
  const [showUploadToast, setShowUploadToast] = useState<{show: boolean, count: number}>({show: false, count: 0});
  
  // Audio Refs
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Web Audio API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const gradientFrom = analysis?.suggestedColorFrom || '#4f46e5'; 
  const gradientTo = analysis?.suggestedColorTo || '#ec4899';

  // --- DATABASE SUBSCRIPTION ---
  useEffect(() => {
    // Initial check
    setIsLive(isLiveMode());
    
    // Subscribe to real-time updates (Firebase or LocalSync)
    const unsubscribe = subscribeToLibrary((updatedSongs) => {
      setSongs(updatedSongs);
      // IMPORTANT: Re-check live mode here. 
      // If Firebase fails and falls back to local, isLiveMode() changes to false automatically.
      setIsLive(isLiveMode());
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Initialize Audio Context and EQ Graph
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      const frequencies = [60, 250, 1000, 4000, 16000];
      const filters = frequencies.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        if (i === 0) filter.type = 'lowshelf';
        else if (i === frequencies.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });
      filtersRef.current = filters;

      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        sourceRef.current = source;
        
        let prevNode: AudioNode = source;
        filters.forEach(f => {
          prevNode.connect(f);
          prevNode = f;
        });
        prevNode.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) {
        console.warn("Audio Graph init failed", e);
      }
    }
  }, []);

  const applyPreset = (preset: EQPreset) => {
    setCurrentPreset(preset);
    const filters = filtersRef.current;
    if (filters.length !== 5) return;

    let gains: number[] = [0, 0, 0, 0, 0];
    switch (preset) {
      case 'Rock': gains = [4, 2, -2, 3, 5]; break;
      case 'Pop': gains = [-1, 2, 4, 1, -1]; break;
      case 'Classical': gains = [4, 2, -1, 3, 4]; break;
      case 'Jazz': gains = [3, 2, -1, 2, 3]; break;
      case 'Bass': gains = [8, 5, 1, 0, 0]; break;
      case 'Normal': default: gains = [0, 0, 0, 0, 0]; break;
    }
    filters.forEach((f, i) => {
      f.gain.setTargetAtTime(gains[i], audioContextRef.current?.currentTime || 0, 0.2);
    });
  };

  useEffect(() => {
    const audio = audioRef.current;
    audio.crossOrigin = "anonymous"; 
    
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => handleNext();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [songs, currentSong]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      // NOTE: For real global file upload, you'd need Firebase Storage. 
      // This implementation handles LOCAL files nicely for the uploader, 
      // but remote users can't access a local blob. 
      // We will warn the user about this distinction.
      const newSongs: Song[] = Array.from(files).map((file: File) => {
        const name = file.name.replace(/\.[^/.]+$/, "");
        return {
          id: generateId(),
          title: name,
          artist: "Uploaded Track", 
          url: URL.createObjectURL(file), // This only works on the uploader's device
          file: file,
          duration: 0,
          isCloud: false
        };
      });

      // Add each to DB (Local sync only for files usually, unless using Storage)
      for (const song of newSongs) {
        await addSongToLibrary(song);
      }
      
      setShowUploadToast({ show: true, count: newSongs.length });
      setTimeout(() => setShowUploadToast({ show: false, count: 0 }), 3000);
      setCurrentView('library');
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Error processing files:", error);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = async () => {
    const url = prompt("Paste direct audio link (mp3/wav) from web:\n(This will be visible to everyone instantly if Online)");
    if (!url) return;
    const title = prompt("Enter Song Title:", "New Song") || "Unknown Title";
    const artist = prompt("Enter Artist:", "Unknown Artist") || "Unknown Artist";

    const newSong: Song = {
      id: generateId(),
      title,
      artist,
      url,
      duration: 0,
      isCloud: true
    };

    await addSongToLibrary(newSong);

    setCurrentView('library');
    setShowUploadToast({ show: true, count: 1 });
    setTimeout(() => setShowUploadToast({ show: false, count: 0 }), 3000);
  };

  const playSong = async (song: Song) => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentSong(song);
      audioRef.current.src = song.url;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        console.error("Play error", e);
      }
    }
  };

  const handlePlayPause = async () => {
    if (currentSong) {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      playSong(currentSong);
    } else if (songs.length > 0) {
      playSong(songs[0]);
    }
  };

  const handleNext = useCallback(() => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    playSong(songs[nextIndex]);
  }, [currentSong, songs]);

  const handlePrev = useCallback(() => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
    playSong(songs[prevIndex]);
  }, [currentSong, songs]);

  const handleSeek = (time: number) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const removeSong = async (id: string) => {
    await removeSongFromLibrary(id);
    if (currentSong?.id === id) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentSong(null);
    }
  };

  const runAnalysis = async () => {
    if (songs.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePlaylistVibe(songs.map(s => s.title));
      setAnalysis(result);
      setCurrentView('home');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setCurrentView('library');
    setShowAdminToast(true);
    setTimeout(() => setShowAdminToast(false), 3000);
  };

  return (
    <div 
      className="h-screen w-screen flex text-white overflow-hidden font-outfit"
      style={{
        background: `radial-gradient(circle at 10% 20%, ${gradientFrom}15, transparent 40%), radial-gradient(circle at 90% 80%, ${gradientTo}10, transparent 40%), #0f172a`
      }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="audio/*,.mp3,.wav,.ogg,.m4a" 
        multiple 
        className="hidden" 
      />

      <AdminLoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLoginSuccess}
      />

      {showAdminToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
          <Lock size={20} className="text-white" />
          <span className="font-semibold">Welcome Back, Admin</span>
        </div>
      )}

      {showUploadToast.show && (
        <div className="fixed top-20 md:top-6 left-1/2 -translate-x-1/2 z-[100] bg-indigo-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
          <Music size={20} className="text-white" />
          <span className="font-semibold">{showUploadToast.count} songs added</span>
        </div>
      )}

      <Sidebar 
        currentView={currentView} 
        isAdmin={isAdmin}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onChangeView={(view) => {
          setCurrentView(view);
          setMobileMenuOpen(false);
        }} 
        onUploadClick={() => fileInputRef.current?.click()} 
        onLoginClick={() => {
          setIsLoginModalOpen(true);
          setMobileMenuOpen(false);
        }}
        onLogoutClick={() => {
          setIsAdmin(false);
          setMobileMenuOpen(false);
        }}
      />

      <div className="md:hidden fixed top-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md z-40 border-b border-white/5 flex justify-between items-center">
        <h1 className="font-bold text-lg">Serhio Tomasito Music</h1>
        <button onClick={() => setMobileMenuOpen(true)}>
          <Menu />
        </button>
      </div>

      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth bg-gradient-to-b from-transparent to-slate-950/50">
        <div className="p-6 md:p-8 pt-20 md:pt-8 max-w-7xl mx-auto min-h-full flex flex-col">
          <div className="flex-1">
            {currentView === 'home' && (
               <HomeView 
                 songs={songs} 
                 analysis={analysis} 
                 onPlay={playSong}
                 currentSong={currentSong}
                 isPlaying={isPlaying}
               />
            )}

            {currentView === 'library' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-1">Library</h2>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>{isAdmin ? "Manage All Tracks" : "Public Collection"}</span>
                      <span className="text-slate-600">•</span>
                      <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isLive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                         {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
                         <span>{isLive ? "LIVE ONLINE" : "LOCAL SYNC"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={runAnalysis}
                    disabled={isAnalyzing || songs.length === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full font-medium transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    <span>Analyze Vibe</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-3 h-48 bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-10"></div>
                       {currentSong && isPlaying ? (
                          <Visualizer 
                            analyser={analyserNode}
                            isPlaying={isPlaying} 
                            accentColor={gradientTo} 
                          />
                       ) : (
                          <div className="z-20 text-slate-600 text-sm">
                             {currentSong ? "Paused" : "Visualizer Idle"}
                          </div>
                       )}
                  </div>

                  <div className="lg:col-span-3">
                    <SongList 
                      songs={songs} 
                      currentSong={currentSong} 
                      isPlaying={isPlaying} 
                      isAdmin={isAdmin}
                      onPlay={playSong}
                      onRemove={removeSong}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="mt-12 mb-28 md:mb-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-500 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
               <a
                href="https://www.serhio-tomasito.online/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-400 transition-colors uppercase tracking-widest font-medium"
               >
                © 2025 SERHIO TOMASITO. TOATE DREPTURILE REZERVATE.
               </a>
               {!isAdmin && (
                 <button 
                   onClick={() => setIsLoginModalOpen(true)}
                   className="flex items-center gap-1 opacity-40 hover:opacity-100 hover:text-indigo-400 transition-all"
                 >
                   <Lock size={10} />
                   <span>Admin</span>
                 </button>
               )}
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10 transition-all hover:scale-105 group cursor-pointer">
              <span className="opacity-60 font-light">Sponsored by</span>
              <a
                href="https://copy-of-geo-seo-architect-373301080346.us-west1.run.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-300 group-hover:text-white flex items-center gap-1"
              >
                <span>GeoSEO Arhitect</span>
                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </footer>
        </div>
      </main>

      {/* ADMIN ACTION BUTTONS */}
      {isAdmin && (
        <div className="fixed bottom-28 right-6 z-40 flex flex-col gap-4 animate-in zoom-in duration-300 items-end">
           {/* Link Upload Button */}
           <div className="relative group">
              <button 
                onClick={handleAddLink}
                className="w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border border-white/10"
                title="Add via Link"
              >
                <LinkIcon size={20} />
              </button>
              <div className="absolute top-2 right-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Add Link (Global)
              </div>
           </div>

           {/* File Upload Button */}
           <div className="relative group">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                title="Upload Files"
              >
                <Upload size={24} />
              </button>
              <div className="absolute top-3 right-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Upload File (Local)
              </div>
           </div>
        </div>
      )}

      <EQPanel 
        isOpen={eqOpen} 
        currentPreset={currentPreset}
        onSelectPreset={applyPreset}
        onClose={() => setEqOpen(false)}
      />
      
      <PlayerControls 
        currentSong={currentSong}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onToggleEQ={() => setEqOpen(!eqOpen)}
        isEQOpen={eqOpen}
        currentPreset={currentPreset}
      />
    </div>
  );
};

export default App;