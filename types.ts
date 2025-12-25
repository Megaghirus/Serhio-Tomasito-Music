export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  file?: File;
  duration: number;
  isCloud?: boolean;
}

export interface PlaylistAnalysis {
  vibe: string;
  description: string;
  suggestedColorFrom: string;
  suggestedColorTo: string;
  playlistName: string;
}

export enum PlayState {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED'
}

export type View = 'home' | 'library';

export type EQPreset = 'Normal' | 'Rock' | 'Pop' | 'Classical' | 'Jazz' | 'Bass';