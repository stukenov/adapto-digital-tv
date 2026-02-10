import type {
  APIChannel,
  APIProgram,
  APIProgramList,
  PaginatedResponse,
  APIError,
  ChannelsQuery,
  ProgramsQuery,
  ScheduleQuery,
  APIConfig
} from '../types/api';
import { apiConfig, features } from '../config/api';

class APIClient {
  private config: APIConfig;

  constructor(config: Partial<APIConfig> = {}) {
    this.config = { ...apiConfig, ...config };
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.config.headers,
        ...options.headers,
      },
    };

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    config.signal = controller.signal;

    try {
      if (features.debugAPI) {
        // eslint-disable-next-line no-console
        console.log(`[API] ${options.method || 'GET'} ${url}`, config);
      }

      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorData: APIError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            detail: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        
        if (features.debugAPI) {
          // eslint-disable-next-line no-console
          console.error(`[API] Error ${response.status}:`, errorData);
        }
        
        throw new Error(errorData.detail);
      }

      const data = await response.json();
      
      if (features.debugAPI) {
        // eslint-disable-next-line no-console
        console.log(`[API] Response:`, data);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Channels API
  async getChannels(query: ChannelsQuery = {}): Promise<PaginatedResponse<APIChannel>> {
    const searchParams = new URLSearchParams();
    if (query.page) searchParams.append('page', query.page.toString());
    
    const endpoint = `/tvchannels/${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.request<PaginatedResponse<APIChannel>>(endpoint);
  }

  async getChannel(slug: string): Promise<APIChannel> {
    return this.request<APIChannel>(`/tvchannels/${slug}/`);
  }

  async getChannelSchedule(
    slug: string, 
    query: ScheduleQuery = {}
  ): Promise<APIProgramList[]> {
    const searchParams = new URLSearchParams();
    if (query.date) searchParams.append('date', query.date);
    
    const endpoint = `/tvchannels/${slug}/schedule/${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.request<APIProgramList[]>(endpoint);
  }

  // Programs API
  async getPrograms(query: ProgramsQuery = {}): Promise<PaginatedResponse<APIProgram>> {
    const searchParams = new URLSearchParams();
    if (query.page) searchParams.append('page', query.page.toString());
    if (query.channel) searchParams.append('channel', query.channel.toString());
    if (query.date) searchParams.append('date', query.date);
    
    const endpoint = `/programs/${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.request<PaginatedResponse<APIProgram>>(endpoint);
  }

  async getProgram(id: number): Promise<APIProgram> {
    return this.request<APIProgram>(`/programs/${id}/`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      await this.request('/tvchannels/?page=1');
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      return { 
        status: 'error', 
        timestamp: new Date().toISOString() 
      };
    }
  }

  // Update configuration
  updateConfig(config: Partial<APIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): APIConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export class for custom instances
export { APIClient }; 