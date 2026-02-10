// API Response Types based on Swagger schema

export interface APIChannel {
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

export interface APIProgram {
  id: number;
  channel: number;
  channel_name: string;
  name: string;
  description: string;
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

// API Request/Response wrappers
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface APIError {
  detail: string;
  code?: string;
}

// Query Parameters
export interface ChannelsQuery {
  page?: number;
}

export interface ProgramsQuery {
  page?: number;
  channel?: number;
  date?: string; // YYYY-MM-DD
}

export interface ScheduleQuery {
  date?: string; // YYYY-MM-DD
}

// API Configuration
export interface APIConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
} 