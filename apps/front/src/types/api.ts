// API Response Types based on Adapto Digital TV API Schema

export interface ApiChannel {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  logo: string | null;
  description: string;
  stream_url: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface ApiProgram {
  id: number;
  channel: number;
  channel_name: string;
  name: string;
  description: string;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  duration: string;
}

export interface ApiProgramList {
  id: number;
  channel_name: string;
  name: string;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
}

export interface ApiResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

// Utility types for API requests
export interface ChannelScheduleParams {
  slug: string;
  date?: string; // YYYY-MM-DD format
}

export interface ProgramsListParams {
  page?: number;
  channel?: number;
  date?: string; // YYYY-MM-DD format
}

// Error response type
export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
} 