import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import { closeAll, verifyConnection } from './db/database.js';
import { mediaRootPath, mediaUrlPrefix } from './utils/media.js';

const app = express();
// Trust the first proxy (e.g. Caddy) so req.protocol honours X-Forwarded-Proto
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8001;

/**
 * Middleware
 */
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * Статическая раздача медиафайлов (например, логотипы каналов).
 * Файлы берутся из общей директории media, которую разделяют Django и Express
 * в docker-compose (volume backend_media).
 */
app.use(mediaUrlPrefix, express.static(mediaRootPath));

if (process.env.NODE_ENV !== 'test') {
  if (fs.existsSync(mediaRootPath)) {
    console.log(`[media] Serving shared media from "${mediaRootPath}" at "${mediaUrlPrefix}"`);
  } else {
    console.warn(`[media] Shared media directory "${mediaRootPath}" is not available. Media requests may fail.`);
  }
}

/**
 * Логирование запросов (для разработки)
 */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

/**
 * API Routes
 * Все роуты монтируются на /api/v1
 */
app.use('/api/v1', apiRoutes);

/**
 * Корневой endpoint для проверки работоспособности
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Adapto Digital TV Express.js API',
    version: '1.0.0',
    description: 'Express.js backend for Adapto Digital TV frontend (without ORM, without admin)',
    endpoints: {
      health: '/api/v1/health/',
      channels: '/api/v1/tvchannels/',
      programs: '/api/v1/programs/',
      auth: '/api/v1/auth/'
    }
  });
});

/**
 * Error handlers (должны быть последними)
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Запуск сервера
 */
const server = app.listen(PORT, async () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('Adapto Digital TV Express.js API Server');
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  - http://localhost:${PORT}/`);
  console.log(`  - http://localhost:${PORT}/api/v1/health/`);
  console.log(`  - http://localhost:${PORT}/api/v1/tvchannels/`);
  console.log(`  - http://localhost:${PORT}/api/v1/programs/`);
  console.log(`  - http://localhost:${PORT}/api/v1/auth/csrf/`);
  console.log('='.repeat(50));
  console.log('');

  // Проверяем подключение к базе данных при старте
  try {
    await verifyConnection();
    console.log('Database connection verified successfully');
    console.log('');
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    console.log('');
  }
});

/**
 * Graceful shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('Server closed');
    try {
      await closeAll();
    } catch (err) {
      console.error('Error while closing database pool:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
