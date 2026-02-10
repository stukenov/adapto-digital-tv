// Re-export types from app-core
export type { Channel, Program, PlayerState as CorePlayerState } from 'adapto-app-core';
// Import Channel type for local use
import type { Channel } from 'adapto-app-core';

// React Native TV specific types
export interface NavigationParams {
  Home: undefined;
  Channel: {
    channel: Channel;
  };
}

// Extended player state for React Native TV
export interface TVPlayerState {
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  // TV specific properties
  isBuffering: boolean;
  quality: string;
}

// TV Remote events for React Native TV
export interface TVRemoteEvent {
  eventType:
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'select'
    | 'back'
    | 'menu'
    | 'playPause';
  target: any;
}


