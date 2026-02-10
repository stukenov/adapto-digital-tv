const { withSentryConfig } = require('@sentry/nextjs');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  
  // Включаем standalone режим для Docker
  output: 'standalone',
  
  // Включаем экспериментальную поддержку runtime env vars
  experimental: {
    // experimental.instrumentationHook больше не требуется в Next 15,
    // оставляем объект пустым или убираем совсем
  },
  
  // Оптимизация изображений
  images: {
    // Предзаданное окружение хостов, откуда приходят логотипы каналов
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: 'dash.example.com',
      },
    ],
    // Включаем современные форматы и увеличиваем TTL кеша оптимизированных изображений
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней
    // Типичные размеры устройств и мелкие размеры для иконок/логотипов
    deviceSizes: [320, 420, 640, 768, 1024, 1280],
    imageSizes: [16, 24, 32, 48, 64, 96],
    // Разрешаем SVG (мы доверяем собственным доменам выше)
    dangerouslyAllowSVG: true,
  },
  // Явный alias на '@/...' → 'src/...', чтобы сборка CI корректно резолвила пути
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  
  // Настройка переменных окружения для standalone
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_LOCALDATA: process.env.NEXT_PUBLIC_LOCALDATA,
  },
};

module.exports = withSentryConfig(nextConfig, {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

org: "adapto-digital-tv",
project: "adapto-front",

// Only print logs for uploading source maps in CI
silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
widenClientFileUpload: true,

// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
automaticVercelMonitors: true,
});