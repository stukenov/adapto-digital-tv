/**
 * Форматирование даты в формат YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Получение текущей даты в формате YYYY-MM-DD
 * @returns {string}
 */
export function getCurrentDate() {
  return formatDate(new Date());
}

/**
 * Парсинг даты из строки YYYY-MM-DD
 * @param {string} dateString
 * @returns {Date|null}
 */
export function parseDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const date = new Date(dateString + 'T00:00:00');
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Форматирование datetime в ISO формат
 * @param {string|Date} value - Дата/время из БД
 * @returns {string} - ISO datetime
 */
export function formatDatetime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    if (/[zZ]$/.test(trimmed)) {
      return trimmed;
    }

    const offsetMatch = trimmed.match(/([+-]\d{2}(?::?\d{2})?)$/);
    if (offsetMatch) {
      const offset = offsetMatch[1];
      const normalizedOffset = offset.includes(':')
        ? offset
        : `${offset.slice(0, 3)}:${offset.slice(3) || '00'}`;
      const base = trimmed.slice(0, -offset.length).trim();
      const withT = base.includes('T') ? base : base.replace(' ', 'T');
      return `${withT}${normalizedOffset}`;
    }

    const withT = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    return `${withT}Z`;
  }

  return null;
}

/**
 * Получение начала и конца дня для SQL запросов
 * @param {string} dateString - YYYY-MM-DD
 * @returns {Object} - {start, end}
 */
export function getDayBounds(dateString) {
  const date = parseDate(dateString) || new Date();
  const start = formatDate(date) + ' 00:00:00';

  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const end = formatDate(nextDay) + ' 00:00:00';

  return { start, end };
}
