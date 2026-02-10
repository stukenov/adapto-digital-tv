import express from 'express';
import {
  getPrograms,
  getProgramById
} from '../controllers/programsController.js';

const router = express.Router();

/**
 * Роуты для работы с программами
 */

// GET /api/v1/programs/ - Список программ с фильтрацией
router.get('/', getPrograms);

// GET /api/v1/programs/:id/ - Детали программы по ID
router.get('/:id/', getProgramById);

export default router;
