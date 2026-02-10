/**
 * Отправка успешного JSON ответа
 * @param {Object} res - Express response
 * @param {*} data - Данные для отправки
 * @param {number} status - HTTP статус (по умолчанию 200)
 */
export function sendSuccess(res, data, status = 200) {
  res.status(status).json(data);
}

/**
 * Отправка ошибки в формате JSON
 * @param {Object} res - Express response
 * @param {string} message - Сообщение об ошибке
 * @param {number} status - HTTP статус (по умолчанию 500)
 * @param {Object} details - Дополнительные детали ошибки
 */
export function sendError(res, message, status = 500, details = null) {
  const error = {
    error: message,
    status
  };

  if (details) {
    error.details = details;
  }

  res.status(status).json(error);
}

/**
 * Отправка ошибки "не найдено"
 * @param {Object} res - Express response
 * @param {string} message - Сообщение (по умолчанию "Not found")
 */
export function sendNotFound(res, message = 'Not found') {
  sendError(res, message, 404);
}

/**
 * Отправка ошибки валидации
 * @param {Object} res - Express response
 * @param {Object} errors - Объект с ошибками валидации
 */
export function sendValidationError(res, errors) {
  sendError(res, 'Validation error', 400, { errors });
}
