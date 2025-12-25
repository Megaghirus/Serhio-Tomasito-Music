import React from 'react';
import { Home, Library, Upload, Heart, Lock, LogOut, X } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  isAdmin: boolean;
  isOpen: boolean;
  onChangeView: (view: View) => void;
  onUploadClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  isAdmin, 
  isOpen,
  onChangeView, 
  onUploadClick, 
  onLoginClick,
  onLogoutClick,
  onClose
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 md:bg-slate-950/50 backdrop-blur-xl border-r border-white/5 flex flex-col h-full shrink-0 transition-transform duration-300 ease-out shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between gap-3 mb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              {/* Custom STM Logo */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
                <path d="M2 10s2-2 4-2 4 2 4 2" className="opacity-0" />
                <path d="M16 8c0-2-2-4-5-4s-3 3-3 3" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg leading-tight tracking-tight truncate">Serhio Tomasito</h1>
              <p className="text-xs text-orange-400 font-medium tracking-widest uppercase">Music</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Navigation - Added min-h-0 for proper flex shrinking */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto min-h-0 py-2">
          <div className="text-xs font-semibold text-slate-500 px-4 py-2 uppercase tracking-wider">
            Discover
          </div>
          
          <button 
            onClick={() => onChangeView('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              currentView === 'home' 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home size={20} />
            <span>Home</span>
          </button>

          <div className="mt-6 text-xs font-semibold text-slate-500 px-4 py-2 uppercase tracking-wider">
            Collection
          </div>

          <button 
            onClick={() => onChangeView('library')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              currentView === 'library' 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Library size={20} />
            <span>My Tracks</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium">
            <Heart size={20} />
            <span>Favorites</span>
          </button>
        </nav>

        {/* Footer Actions - Always visible at bottom */}
        <div className="p-4 mt-auto border-t border-white/5 space-y-2 bg-slate-900/50 md:bg-transparent shrink-0">
          {isAdmin ? (
            <>
              <button 
                onClick={onUploadClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
              >
                <Upload size={18} />
                <span>Upload Music</span>
              </button>
              <button 
                onClick={onLogoutClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-slate-500 hover:text-red-400 transition-colors mt-2"
              >
                <LogOut size={14} />
                <span>Admin Logout</span>
              </button>
            </>
          ) : (
            <button 
              onClick={onLoginClick}
              className="w-full flex items-center gap-2 px-4 py-3 text-indigo-300 hover:text-white hover:bg-white/10 border border-indigo-500/20 hover:border-indigo-400/40 rounded-xl transition-all text-sm group shadow-lg shadow-indigo-900/10"
            >
              <Lock size={16} className="text-indigo-400 group-hover:text-white transition-colors" />
              <span>Admin Access</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;