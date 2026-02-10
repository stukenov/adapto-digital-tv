// Export API types
export * from './api';

// Core Domain Types (Frontend)
export interface Channel {
  id: string;
  name: string;
  slug?: string;
  logo: string | null;
  description?: string;
  streamUrl: string;
  currentProgram: Program;
  schedule: Program[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration?: string;
  image?: string;
  channelId?: string;
  channelName?: string;
}

export interface RemoteEvent {
  type: 'up' | 'down' | 'left' | 'right' | 'enter' | 'back';
  preventDefault: () => void;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error?: string | null;
}

// Loading and Error States
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ChannelsState extends LoadingState {
  channels: Channel[];
  currentChannel: Channel | null;
}

export interface ProgramsState extends LoadingState {
  programs: Program[];
  currentProgram: Program | null;
}

// API Response Status
export type APIStatus = 'idle' | 'loading' | 'success' | 'error';

export interface APIState<T> {
  data: T | null;
  status: APIStatus;
  error: string | null;
}
