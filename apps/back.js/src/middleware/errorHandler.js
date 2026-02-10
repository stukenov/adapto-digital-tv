import { sendError } from '../utils/response.js';

/**
 * Middleware для обработки ошибок
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Если это ошибка базы данных
  if (err.code === 'SQLITE_ERROR') {
    return sendError(res, 'Database error', 500, {
      message: err.message
    });
  }

  // Общая ошибка сервера
  sendError(res, err.message || 'Internal server error', err.status || 500);
}

/**
 * Middleware для обработки 404
 */
export function notFoundHandler(req, res) {
  sendError(res, `Route ${req.method} ${req.url} not found`, 404);
}
