import { 
  ApiChannel, 
  ApiProgram, 
  ApiProgramList, 
  ApiResponse, 
  ApiError,
  ChannelScheduleParams,
  ProgramsListParams 
} from '@/types/api';

// Конфигурация API
// По умолчанию используем относительный путь, чтобы работать через Caddy на том же домене
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
export const USE_LOCALDATA = (process.env.NEXT_PUBLIC_LOCALDATA || '').toString() === 'true';

// Базовый класс для API запросов
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    console.log('API Request:', url, defaultOptions);

    try {
      const response = await fetch(url, defaultOptions);
      
      console.log('API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        
        let errorData: ApiError;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {
            detail: `HTTP ${response.status}: ${response.statusText}`,
            message: errorText
          };
        }
        
        throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    // Всегда добавляем format=json для Django REST API
    const allParams: Record<string, string | number> = { format: 'json', ...params };
    const searchParams = new URLSearchParams(
      Object.entries(allParams).map(([key, value]) => [key, String(value)])
    ).toString();
    
    const url = `${endpoint}?${searchParams}`;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Создаем экземпляр API клиента
const apiClient = new ApiClient(API_BASE_URL);

// API сервисы
export const channelsApi = {
  // Получить список всех активных каналов
  async getChannels(page?: number): Promise<ApiChannel[]> {
    const params = page ? { page } : undefined;
    const response = await apiClient.get<ApiChannel[] | ApiResponse<ApiChannel>>('/tvchannels/', params);
    
    // Обработка разных форматов ответа (массив или объект с results)
    const list = Array.isArray(response) ? response : response.results;
    // Сортировка по sort_order desc, затем по имени
    return list.sort((a, b) => {
      const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (ao !== bo) return bo - ao;
      return a.name.localeCompare(b.name, 'ru');
    });
  },

  // Получить информацию о канале по slug
  async getChannel(slug: string): Promise<ApiChannel> {
    return apiClient.get<ApiChannel>(`/tvchannels/${slug}/`);
  },

  // Получить расписание канала
  async getChannelSchedule(params: ChannelScheduleParams): Promise<ApiProgramList[]> {
    const queryParams = params.date ? { date: params.date } : undefined;
    return apiClient.get<ApiProgramList[]>(`/tvchannels/${params.slug}/schedule/`, queryParams);
  },
};

export const programsApi = {
  // Получить список программ
  async getPrograms(params?: ProgramsListParams): Promise<ApiProgram[]> {
    // Преобразуем параметры в нужный формат
    const queryParams: Record<string, string | number> | undefined = params ? {
      ...(params.page && { page: params.page }),
      ...(params.channel && { channel: params.channel }),
      ...(params.date && { date: params.date }),
    } : undefined;
    
    const response = await apiClient.get<ApiProgram[] | ApiResponse<ApiProgram>>('/programs/', queryParams);
    
    // Обработка разных форматов ответа
    return Array.isArray(response) ? response : response.results;
  },

  // Получить информацию о программе по ID
  async getProgram(id: number): Promise<ApiProgram> {
    return apiClient.get<ApiProgram>(`/programs/${id}/`);
  },
};

// Утилиты для работы с API
export const apiUtils = {
  // Проверка доступности API
  async healthCheck(): Promise<boolean> {
    try {
      await apiClient.get('/tvchannels/');
      return true;
    } catch {
      return false;
    }
  },

  // Получение текущей даты в формате API
  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  },

  // Получение даты с offset в днях
  getDateWithOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  },
};

// Экспорт для использования в компонентах
export { apiClient };

const apiServices = { channelsApi, programsApi, apiUtils };
export default apiServices; 