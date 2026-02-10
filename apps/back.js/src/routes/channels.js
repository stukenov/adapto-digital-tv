import express from 'express';
import {
  getChannels,
  getChannelBySlug,
  getChannelSchedule
} from '../controllers/channelsController.js';

const router = express.Router();

/**
 * Роуты для работы с каналами
 */

// GET /api/v1/tvchannels/ - Список всех активных каналов
router.get('/', getChannels);

// GET /api/v1/tvchannels/:slug/schedule/ - Расписание канала
router.get('/:slug/schedule/', getChannelSchedule);

// GET /api/v1/tvchannels/:slug/ - Детали канала по slug
router.get('/:slug/', getChannelBySlug);

export default router;
