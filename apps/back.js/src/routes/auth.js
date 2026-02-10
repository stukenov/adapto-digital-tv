import express from 'express';
import {
  getCsrfToken,
  getCurrentUser,
  login,
  logout
} from '../controllers/authController.js';

const router = express.Router();

/**
 * Роуты для аутентификации
 * Примечание: В этой версии API аутентификация не реализована,
 * так как это только API для фронтенда без админки.
 */

// GET /api/v1/auth/csrf/ - Получить CSRF токен
router.get('/csrf/', getCsrfToken);

// GET /api/v1/auth/me/ - Текущий пользователь
router.get('/me/', getCurrentUser);

// POST /api/v1/auth/login/ - Логин (не реализовано)
router.post('/login/', login);

// POST /api/v1/auth/logout/ - Логаут (не реализовано)
router.post('/logout/', logout);

export default router;
