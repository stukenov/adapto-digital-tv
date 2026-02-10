import express from 'express';
import channelsRoutes from './channels.js';
import programsRoutes from './programs.js';
import authRoutes from './auth.js';

const router = express.Router();

/**
 * Главный роутер API v1
 * Монтирует все подроуты
 */

// Каналы
router.use('/tvchannels', channelsRoutes);

// Программы
router.use('/programs', programsRoutes);

// Аутентификация
router.use('/auth', authRoutes);

// Health check endpoint
router.get('/health/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default router;
