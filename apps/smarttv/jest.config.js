/** @type {import('jest').Config} */
export default {
  // Основные настройки
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'jsdom',
  
  // Корневая папка для тестов
  roots: ['<rootDir>/packages'],
  
  // Паттерны для поиска тестов
  testMatch: [
    '<rootDir>/packages/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/packages/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  
  // Расширения файлов
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Трансформация файлов
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { 
      presets: ['@babel/preset-env', '@babel/preset-react'],
      configFile: './babel.config.cjs'
    }],
  },
  
  // Модули для мокирования
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/packages/$1/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': 'jest-transform-stub',
  },
  
  // Файлы для настройки тестовой среды
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Игнорирование файлов
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/.*/dist/',
    '<rootDir>/packages/.*/build/',
  ],
  
  // Игнорирование трансформации для определенных модулей
  transformIgnorePatterns: [
    'node_modules/(?!(hls\\.js|dash\\.js)/)',
  ],
  
  // Покрытие кода
  collectCoverageFrom: [
    'packages/**/src/**/*.{ts,tsx}',
    '!packages/**/src/**/*.d.ts',
    '!packages/**/src/**/*.stories.{ts,tsx}',
    '!packages/**/src/**/*.test.{ts,tsx}',
    '!packages/**/src/**/*.spec.{ts,tsx}',
    '!packages/**/src/index.ts',
    '!packages/**/src/main.tsx',
  ],
  
  // Папки для отчетов о покрытии
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Пороги покрытия
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Настройки для Smart TV специфичных тестов
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Таймауты
  testTimeout: 10000,
  
  // Очистка моков между тестами
  clearMocks: true,
  
  // Восстановление моков между тестами
  restoreMocks: true,
  
  // Verbose вывод
  verbose: true,
}; 