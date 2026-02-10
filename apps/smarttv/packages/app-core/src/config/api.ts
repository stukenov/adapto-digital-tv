import type { APIConfig } from '../types/api';

// Environment variables helper
function getEnvVar(name: string, defaultValue: string): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || defaultValue;
  }
  
  // For browser environments, check window variables
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[name] || defaultValue;
  }
  
  return defaultValue;
}

// Base API configurations for different environments
const apiConfigs: Record<string, Partial<APIConfig>> = {
  development: {
    baseURL: 'https://dash.example.com/api/v1',
    timeout: 10000,
  },
  
  staging: {
    baseURL: 'https://dash.example.com/api/v1',
    timeout: 15000,
  },
  
  production: {
    baseURL: 'https://dash.example.com/api/v1',
    timeout: 10000,
  },
};

// Get current environment
const environment = getEnvVar('NODE_ENV', 'development');

// API configuration with environment overrides
export const apiConfig: APIConfig = {
  baseURL: getEnvVar('REACT_APP_API_BASE_URL', apiConfigs[environment]?.baseURL || apiConfigs.development.baseURL!),
  timeout: parseInt(getEnvVar('REACT_APP_API_TIMEOUT', String(apiConfigs[environment]?.timeout || 10000))),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': getEnvVar('REACT_APP_VERSION', '1.0.0'),
    'X-Client-Platform': getEnvVar('REACT_APP_PLATFORM', 'web'),
  },
};

// Feature flags
export const features = {
  // Enable debug logging for API calls
  debugAPI: getEnvVar('REACT_APP_DEBUG_API', environment === 'development' ? 'true' : 'false') === 'true',
  
  // Enable offline mode support (caching only, no mock data)
  offlineMode: getEnvVar('REACT_APP_OFFLINE_MODE', 'false') === 'true',
  
  // Enable analytics
  analytics: getEnvVar('REACT_APP_ANALYTICS', environment === 'production' ? 'true' : 'false') === 'true',
  
  // Enable performance monitoring
  performanceMonitoring: getEnvVar('REACT_APP_PERFORMANCE_MONITORING', environment === 'production' ? 'true' : 'false') === 'true',
};

// Smart TV platform detection
export const platform = {
  isTizen: typeof navigator !== 'undefined' && navigator.userAgent.includes('Tizen'),
  isWebOS: typeof navigator !== 'undefined' && navigator.userAgent.includes('webOS'),
  isAndroidTV: typeof navigator !== 'undefined' && navigator.userAgent.includes('Android') && navigator.userAgent.includes('TV'),
  isSafari: typeof navigator !== 'undefined' && navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'),
  isDesktop: typeof navigator !== 'undefined' && !navigator.userAgent.includes('Mobile') && !navigator.userAgent.includes('TV'),
};

// Platform-specific API adjustments
if (platform.isTizen) {
  apiConfig.timeout = 15000; // Tizen may be slower
  apiConfig.headers!['X-Client-Platform'] = 'tizen';
}

if (platform.isWebOS) {
  apiConfig.timeout = 15000; // webOS may be slower  
  apiConfig.headers!['X-Client-Platform'] = 'webos';
}

if (platform.isAndroidTV) {
  apiConfig.headers!['X-Client-Platform'] = 'android-tv';
}

// Debug logging
if (features.debugAPI) {
  // eslint-disable-next-line no-console
  console.log('Adapto Digital TV API Configuration:', {
    environment,
    config: apiConfig,
    features,
    platform,
  });
} 