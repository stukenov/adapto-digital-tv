import '@testing-library/jest-dom';

// Мокирование Web APIs для Smart TV
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Мокирование Intersection Observer
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Мокирование matchMedia для адаптивности
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Мокирование localStorage для Smart TV
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Мокирование sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Мокирование navigator для Smart TV
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/85.0.4183.93 TV Safari/537.36',
  configurable: true,
});

// Мокирование HLS.js
jest.mock('hls.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      loadSource: jest.fn(),
      attachMedia: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
    })),
    isSupported: jest.fn().mockReturnValue(true),
    Events: {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError',
    },
  };
});

// Мокирование Video элемента
HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined);
HTMLVideoElement.prototype.pause = jest.fn();
HTMLVideoElement.prototype.load = jest.fn();

// Мокирование Canvas для возможных графических операций
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
  }),
  putImageData: jest.fn(),
  createImageData: jest.fn().mockReturnValue({}),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn().mockReturnValue({ width: 0 }),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
});

// Глобальные переменные для тестирования
global.console = {
  ...console,
  // Отключаем некоторые логи в тестах
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Настройка для async/await в тестах
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

// Мокирование для Smart TV специфичных API
if (typeof window !== 'undefined') {
  // Tizen TV API mock
  window.tizen = {
    application: {
      getCurrentApplication: jest.fn().mockReturnValue({
        exit: jest.fn(),
        hide: jest.fn(),
      }),
    },
  };
  
  // webOS TV API mock
  window.webOS = {
    service: {
      request: jest.fn(),
    },
    platform: {
      tv: true,
    },
  };
}

// Увеличиваем таймаут для тестов
jest.setTimeout(10000); 