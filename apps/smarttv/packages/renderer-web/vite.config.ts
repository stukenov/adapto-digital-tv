import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Кэширование для Smart TV
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.m3u8$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hls-streams',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 часа
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Adapto Digital TV Smart TV',
        short_name: 'Adapto Digital TV',
        description: 'Universal Smart TV Application',
        theme_color: '#007AFF',
        background_color: '#000000',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'adapto-app-core': path.resolve(__dirname, '../app-core/dist'),
    },
  },
  define: {
    // Переменные для разных режимов сборки
    __DEV__: mode === 'development',
    __TIZEN__: mode === 'tizen',
    __WEBOS__: mode === 'webos',
    __PWA__: mode === 'pwa',
  },
  build: {
    target: mode === 'tizen' ? 'es2015' : 'es2020',
    minify: mode === 'development' ? false : 'terser',
    terserOptions: {
      compress: {
        drop_console: mode !== 'development',
        drop_debugger: mode !== 'development',
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['styled-components'],
          player: ['hls.js'],
          core: ['adapto-app-core'],
        },
      },
    },
    // Оптимизация для Smart TV
    chunkSizeWarningLimit: 1000,
    assetsDir: 'assets',
    sourcemap: mode === 'development',
  },
  server: {
    port: 3000,
    host: true,
    open: false,
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    },
  },
  preview: {
    port: 3001,
    host: true,
    open: false,
  },
  // Оптимизация зависимостей
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'styled-components',
      'adapto-app-core'
    ],
    exclude: ['@vitejs/plugin-react'],
  },
  // CSS настройки
  css: {
    devSourcemap: mode === 'development',
    preprocessorOptions: {
      scss: {
        additionalData: `
          $tv-breakpoint-sm: 1280px;
          $tv-breakpoint-md: 1920px;
          $tv-breakpoint-lg: 3840px;
        `,
      },
    },
  },
  // Настройки для тестирования
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
