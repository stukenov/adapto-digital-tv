// API Types based on Adapto Digital TV Swagger API
export interface APIChannel {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  logo?: string;
  description?: string;
  stream_url: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface APIProgram {
  id: number;
  channel: number;
  channel_name: string;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  duration: string;
}

export interface APIProgramList {
  id: number;
  channel_name: string;
  name: string;
  start_time: string;
  end_time: string;
}

// Legacy types for compatibility (will be gradually replaced)
export interface TVProgram {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface TVChannel {
  id: string;
  name: string;
  logo: string;
  screenshot: string;
  streamUrl: string;
  currentProgram: TVProgram;
  nextProgram: TVProgram;
  schedule: TVProgram[];
}

export interface TVChannelPreview extends TVChannel {
  isPlaying?: boolean;
}

// Enhanced types combining API data with UI needs
export interface EnhancedChannel extends APIChannel {
  currentProgram?: APIProgram;
  nextProgram?: APIProgram;
  schedule?: APIProgram[];
}

// API Response types
export interface APIResponse<T> {
  results?: T[];
  count?: number;
  next?: string;
  previous?: string;
}

// Loading and error states
export interface LoadingState {
  isLoading: boolean;
  error?: string;
} 