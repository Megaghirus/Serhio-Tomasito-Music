import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, Menu, ExternalLink, Lock, Upload, CheckCircle, Music, Cloud } from 'lucide-react';
import { Song, PlaylistAnalysis, View, EQPreset } from './types';
import PlayerControls from './components/PlayerControls';
import SongList from './components/SongList';
import Visualizer from './components/Visualizer';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import AdminLoginModal from './components/AdminLoginModal';
import EQPanel from './components/EQPanel';
import { analyzePlaylistVibe } from './services/geminiService';

// GLOBAL CLOUD LIBRARY
// These songs are hosted on the internet and will be visible to ANYONE who visits the app
const GLOBAL_LIBRARY: Song[] = [
  {
    id: 'cloud-1',
    title: 'Summer Walk',
    artist: 'Olexy (Global Hit)',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=summer-walk-112694.mp3',
    duration: 0,
    isCloud: true
  },
  {
    id: 'cloud-2',
    title: 'Lofi Chill',
    artist: 'FASSounds',
    url: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc8c8375ae.mp3?filename=lofi-study-112191.mp3',
    duration: 0,
    isCloud: true
  },
  {
    id: 'cloud-3',
    title: 'Cyberpunk City',
    artist: 'Serhio Originals',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=cyberpunk-city-115516.mp3',
    duration: 0,
    isCloud: true
  },
   {
    id: 'cloud-4',
    title: 'Good Night',
    artist: 'FASSounds',
    url: 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_30db2fd25d.mp3?filename=good-night-112676.mp3',
    duration: 0,
    isCloud: true
  }
];

const App: React.FC = () => {
  // Initialize with Global Library
  const [songs, setSongs] = useState<Song[]>(GLOBAL_LIBRARY);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analysis, setAnalysis] = useState<PlaylistAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentView, setCurrentView] = useState<View>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null); // State to force re-render for Visualizer

  // Theme derived from analysis or default
  const gradientFrom = analysis?.suggestedColorFrom || '#4f46e5'; 
  const gradientTo = analysis?.suggestedColorTo || '#ec4899';

  // Initialize Audio Context and EQ Graph
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      setAnalyserNode(analyser); // Save to state for Visualizer prop

      // Create 5 Filters for EQ (60, 250, 1000, 4000, 16000 Hz)
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

      // Create Source (handle potentially missing source or CORS in real apps, but ok for local)
      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        sourceRef.current = source;
        
        // Connect Graph: Source -> Filter1 -> ... -> Filter5 -> Analyser -> Destination
        let prevNode: AudioNode = source;
        filters.forEach(f => {
          prevNode.connect(f);
          prevNode = f;
        });
        prevNode.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) {
        console.warn("Audio Graph init failed (likely element already connected)", e);
      }
    }
  }, []);

  // Handle EQ Presets
  const applyPreset = (preset: EQPreset) => {
    setCurrentPreset(preset);
    const filters = filtersRef.current;
    if (filters.length !== 5) return;

    // Gains for [60, 250, 1k, 4k, 16k]
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
      // Smooth transition
      f.gain.setTargetAtTime(gains[i], audioContextRef.current?.currentTime || 0, 0.2);
    });
  };

  useEffect(() => {
    const audio = audioRef.current;
    // Cross origin setting often needed for visuals on some browsers/CDN
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, currentSong]);

  const generateId = () => {
    // Safer ID generation than crypto.randomUUID() for older browsers/http
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const newSongs: Song[] = Array.from(files).map((file: File) => {
        // Remove extension from name
        const name = file.name.replace(/\.[^/.]+$/, "");
        return {
          id: generateId(),
          title: name,
          artist: "Local Upload", 
          url: URL.createObjectURL(file),
          file: file,
          duration: 0,
          isCloud: false
        };
      });

      setSongs((prev) => {
        // Combine uploads with existing library
        const updated = [...prev, ...newSongs];
        return updated;
      });
      
      // Show Success Toast
      setShowUploadToast({ show: true, count: newSongs.length });
      setTimeout(() => setShowUploadToast({ show: false, count: 0 }), 3000);

      // Switch to library to show upload success
      setCurrentView('library');
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing files. Please try again.");
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const playSong = async (song: Song) => {
    // Resume AudioContext if suspended (browser policy)
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
      // Resume context here as well
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong, songs]);

  const handlePrev = useCallback(() => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
    playSong(songs[prevIndex]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong, songs]);

  const handleSeek = (time: number) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const removeSong = (id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
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

      {/* Admin Success Toast */}
      {showAdminToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
          <Lock size={20} className="text-white" />
          <span className="font-semibold">Welcome Back, Admin</span>
        </div>
      )}

      {/* Upload Success Toast */}
      {showUploadToast.show && (
        <div className="fixed top-20 md:top-6 left-1/2 -translate-x-1/2 z-[100] bg-indigo-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
          <Music size={20} className="text-white" />
          <span className="font-semibold">{showUploadToast.count} songs added to library</span>
        </div>
      )}

      {/* Sidebar Navigation */}
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

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md z-40 border-b border-white/5 flex justify-between items-center">
        <h1 className="font-bold text-lg">Serhio Tomasito Music</h1>
        <button onClick={() => setMobileMenuOpen(true)}>
          <Menu />
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth bg-gradient-to-b from-transparent to-slate-950/50">
        
        {/* Content Wrapper */}
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
                    <p className="text-slate-400">
                      {isAdmin ? "Global & Local Tracks" : "Public Collection"}
                    </p>
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
                  {/* Visualizer in Library */}
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

          {/* Footer Section */}
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
               
               {/* Backup Admin Login Link */}
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

      {/* FLOATING ADMIN UPLOAD BUTTON - Always visible when Admin */}
      {isAdmin && (
        <div className="fixed bottom-28 right-6 z-40 animate-in zoom-in duration-300">
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
             title="Upload Music"
           >
             <Upload size={24} />
           </button>
           <div className="absolute -top-8 right-0 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
             Upload
           </div>
        </div>
      )}

      {/* Global Player */}
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