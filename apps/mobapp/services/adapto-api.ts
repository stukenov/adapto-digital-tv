import { APIChannel, APIProgram, APIProgramList, APIResponse } from '@/types/tv';

// Mock data for fallback when real API is not available
const mockAPIChannels: APIChannel[] = [
  {
    id: 1,
    name: 'Adapto Serial',
    slug: 'adapto-serial',
    is_active: true,
    logo: 'https://via.placeholder.com/100x60/FF0000/FFFFFF?text=QS',
    description: 'Series and movies',
    stream_url: 'https://example.com/hls/live/stream1/index.m3u8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Adapto Music',
    slug: 'adapto-music',
    is_active: true,
    logo: 'https://via.placeholder.com/100x60/0000FF/FFFFFF?text=QM',
    description: 'Music and clips',
    stream_url: 'https://example.com/hls/live/stream2/index.m3u8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Adapto Sport',
    slug: 'adapto-sport',
    is_active: true,
    logo: 'https://via.placeholder.com/100x60/00FF00/FFFFFF?text=QSp',
    description: 'Sports programs and broadcasts',
    stream_url: 'https://example.com/hls/live/stream3/index.m3u8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://dash.example.com/api/v1';
const USE_MOCK_FALLBACK = false; // Set to true to use mock data instead of real API

// Basic Auth credentials (you should move these to environment variables in production)
const API_USERNAME = ''; // API может не требовать аутентификацию
const API_PASSWORD = ''; // API может не требовать аутентификацию

class AdaptoAPIService {
  private baseURL: string;
  private authHeader: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.authHeader = this.createAuthHeader();
  }

  private createAuthHeader(): string {
    if (API_USERNAME && API_PASSWORD) {
      const credentials = btoa(`${API_USERNAME}:${API_PASSWORD}`);
      return `Basic ${credentials}`;
    }
    return '';
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authHeader) {
      defaultHeaders['Authorization'] = this.authHeader;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log('🌐 API Request:', url);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          body: errorText
        });
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Success:', `${url} - ${Array.isArray(data) ? data.length : (data.results?.length || 'object')} items`);
      return data;
    } catch (error) {
      console.error('💥 API Request failed:', error);
      throw error;
    }
  }

  // Channels API
  async getChannels(page?: number): Promise<APIChannel[]> {
    const params = new URLSearchParams();
    if (page) {
      params.append('page', page.toString());
    }
    
    const endpoint = `/tvchannels/${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest<APIResponse<APIChannel> | APIChannel[]>(endpoint);
    
    // Handle both paginated and direct array responses
    if (Array.isArray(response)) {
      return response.sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
        if (ao !== bo) return bo - ao;
        return a.name.localeCompare(b.name, 'ru');
      });
    } else if (response && 'results' in response && Array.isArray(response.results)) {
      return response.results.sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
        if (ao !== bo) return bo - ao;
        return a.name.localeCompare(b.name, 'ru');
      });
    } else {
      console.warn('Unexpected API response format:', response);
      return [];
    }
  }

  async getChannelBySlug(slug: string): Promise<APIChannel> {
    return this.makeRequest<APIChannel>(`/tvchannels/${slug}/`);
  }

  async getChannelSchedule(
    slug: string, 
    date?: string
  ): Promise<APIProgramList[]> {
    const params = new URLSearchParams();
    if (date) {
      params.append('date', date);
    }
    
    const endpoint = `/tvchannels/${slug}/schedule/${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest<APIResponse<APIProgramList> | APIProgramList[]>(endpoint);
    
    // Handle both paginated and direct array responses
    if (Array.isArray(response)) {
      return response;
    } else if (response && 'results' in response && Array.isArray(response.results)) {
      return response.results;
    } else {
      console.warn('Unexpected API response format for schedule:', response);
      return [];
    }
  }

  // Programs API
  async getPrograms(options: {
    page?: number;
    channel?: number;
    date?: string;
  } = {}): Promise<APIProgram[]> {
    if (USE_MOCK_FALLBACK) {
      console.log('🎭 Using mock data for programs');
      return []; // Return empty for now as we don't have mock programs
    }

    try {
      const params = new URLSearchParams();
      
      if (options.page) {
        params.append('page', options.page.toString());
      }
      if (options.channel) {
        params.append('channel', options.channel.toString());
      }
      if (options.date) {
        params.append('date', options.date);
      }
      
      const endpoint = `/programs/${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await this.makeRequest<APIResponse<APIProgram> | APIProgram[]>(endpoint);
      
      // Handle both paginated and direct array responses
      if (Array.isArray(response)) {
        return response;
      } else if (response && 'results' in response && Array.isArray(response.results)) {
        return response.results;
      } else {
        console.warn('⚠️ Unexpected API response format for programs:', response);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch programs, returning empty list:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async getProgramById(id: number): Promise<APIProgram> {
    return this.makeRequest<APIProgram>(`/programs/${id}/`);
  }

  // Helper methods for UI
  async getChannelsWithCurrentPrograms(): Promise<APIChannel[]> {
    if (USE_MOCK_FALLBACK) {
      console.log('Using mock data instead of real API');
      return mockAPIChannels.filter(channel => channel.is_active);
    }

    try {
      const channels = await this.getChannels();
      
      // Filter only active channels
      const activeChannels = channels.filter(channel => channel.is_active);
      
      return activeChannels;
    } catch (error) {
      console.error('Failed to fetch channels with programs, falling back to mock data:', error);
      // Fallback to mock data if API fails
      return mockAPIChannels.filter(channel => channel.is_active);
    }
  }

  async getChannelWithSchedule(slug: string, date?: string): Promise<{
    channel: APIChannel;
    schedule: APIProgramList[];
  }> {
    if (USE_MOCK_FALLBACK) {
      console.log('🎭 Using mock data for channel schedule');
      const mockChannel = mockAPIChannels.find(c => c.slug === slug);
      if (!mockChannel) {
        throw new Error(`Mock channel not found: ${slug}`);
      }
      return {
        channel: mockChannel,
        schedule: []
      };
    }

    try {
      const [channel, schedule] = await Promise.all([
        this.getChannelBySlug(slug),
        this.getChannelSchedule(slug, date)
      ]);

      return {
        channel,
        schedule
      };
    } catch (error) {
      console.error('❌ Failed to fetch channel with schedule, using fallback:', error);
      // Fallback to mock data
      const mockChannel = mockAPIChannels.find(c => c.slug === slug);
      if (mockChannel) {
        return {
          channel: mockChannel,
          schedule: []
        };
      }
      throw error;
    }
  }

  // Utility functions
  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  getTodayDate(): string {
    return this.formatDateForAPI(new Date());
  }

  // Helper to convert APIChannel to legacy TVChannel format (for gradual migration)
  convertToLegacyChannel(apiChannel: APIChannel, currentProgram?: APIProgram, nextProgram?: APIProgram): any {
    // Generate placeholder logo with channel initial
    const channelInitial = apiChannel.name.charAt(0).toUpperCase();
    const logoPlaceholder = `https://via.placeholder.com/100x60/007AFF/FFFFFF?text=${encodeURIComponent(channelInitial)}`;
    const screenshotPlaceholder = `https://via.placeholder.com/320x180/007AFF/FFFFFF?text=${encodeURIComponent(apiChannel.name)}`;

    return {
      id: apiChannel.id.toString(),
      name: apiChannel.name,
      logo: apiChannel.logo || logoPlaceholder,
      screenshot: apiChannel.logo || screenshotPlaceholder,
      streamUrl: apiChannel.stream_url,
      currentProgram: currentProgram ? {
        id: currentProgram.id.toString(),
        name: currentProgram.name,
        startTime: this.formatTime(currentProgram.start_time),
        endTime: this.formatTime(currentProgram.end_time),
        description: currentProgram.description
      } : {
        id: '0',
        name: 'В эфире',
        startTime: '00:00',
        endTime: '23:59',
        description: 'Смотрите программу передач'
      },
      nextProgram: nextProgram ? {
        id: nextProgram.id.toString(),
        name: nextProgram.name,
        startTime: this.formatTime(nextProgram.start_time),
        endTime: this.formatTime(nextProgram.end_time),
        description: nextProgram.description
      } : {
        id: '0',
        name: 'Следующая программа',
        startTime: '00:00',
        endTime: '23:59',
        description: 'Следующая программа'
      },
      schedule: []
    };
  }

  private formatTime(dateTimeString: string): string {
    try {
      // Handle both ISO format and "YYYY-MM-DD HH:MM:SS" format
      let date: Date;
      if (dateTimeString.includes('T')) {
        // ISO format
        date = new Date(dateTimeString);
      } else {
        // "YYYY-MM-DD HH:MM:SS" format - add timezone info
        date = new Date(dateTimeString + 'Z'); // Treat as UTC
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateTimeString);
        return '00:00';
      }
      
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Date formatting error:', error, dateTimeString);
      return '00:00';
    }
  }
}

// Export singleton instance
export const adaptoAPI = new AdaptoAPIService();
export default adaptoAPI; 