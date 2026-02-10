// API Configuration for Adapto Digital TV
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://dash.example.com/api/v1',
  TIMEOUT: 10000, // 10 seconds
  
  // В продакшене эти данные должны быть в environment variables
  AUTH: {
    USERNAME: '', // Добавьте ваш username
    PASSWORD: '', // Добавьте ваш password
  },
  
  // Endpoints
  ENDPOINTS: {
    CHANNELS: '/tvchannels/',
    CHANNEL_DETAIL: (slug: string) => `/tvchannels/${slug}/`,
    CHANNEL_SCHEDULE: (slug: string) => `/tvchannels/${slug}/schedule/`,
    PROGRAMS: '/programs/',
    PROGRAM_DETAIL: (id: number) => `/programs/${id}/`,
  }
};

// Environment-specific overrides
export const getApiConfig = () => {
  // Всегда используем production API для всех окружений
  return API_CONFIG;
}; 