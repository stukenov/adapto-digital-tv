import { sendSuccess } from '../utils/response.js';

/**
 * Получить CSRF токен
 * GET /api/v1/auth/csrf/
 *
 * Примечание: В Express.js без Django CSRF токены работают иначе.
 * Для совместимости с фронтендом возвращаем пустой токен.
 */
export function getCsrfToken(req, res) {
  // Для совместимости с Django фронтендом
  sendSuccess(res, {
    csrfToken: 'not-required-in-express'
  });
}

/**
 * Получить текущего пользователя
 * GET /api/v1/auth/me/
 *
 * Примечание: Аутентификация не реализована в этой версии,
 * так как это только API для фронтенда без админки.
 */
export function getCurrentUser(req, res) {
  // Возвращаем null так как у нас нет аутентификации
  sendSuccess(res, null);
}

/**
 * Логин (не реализовано)
 * POST /api/v1/auth/login/
 */
export function login(req, res) {
  sendSuccess(res, {
    error: 'Authentication not implemented in this API server'
  }, 501);
}

/**
 * Логаут (не реализовано)
 * POST /api/v1/auth/logout/
 */
export function logout(req, res) {
  sendSuccess(res, {
    message: 'Authentication not implemented in this API server'
  }, 501);
}
