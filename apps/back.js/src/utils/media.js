import path from 'path';

const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const DEFAULT_MEDIA_ROOT = '/app/media';
const DEFAULT_MEDIA_URL_PREFIX = '/api/v1/media';

const normalizePrefix = (prefix) => {
  if (!prefix) {
    return DEFAULT_MEDIA_URL_PREFIX;
  }

  let normalized = prefix.trim();

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Убираем завершающие слэши, чтобы избежать двойных // при конкатенации
  normalized = normalized.replace(/\/+$/, '');

  return normalized || '/';
};

export const mediaRootPath = path.resolve(process.env.MEDIA_ROOT || DEFAULT_MEDIA_ROOT);
export const mediaUrlPrefix = normalizePrefix(process.env.MEDIA_URL_PREFIX || DEFAULT_MEDIA_URL_PREFIX);

/**
 * Формирует корректный URL для доступа к медиафайлам.
 * Если путь относительный (например, "channel_logos/logo.png"), то функция
 * превратит его в абсолютный адрес, который раздаёт сам Express.
 * Если путь уже абсолютный (http/https или protocol-relative), возвращается как есть.
 *
 * @param {string|null} filePath - путь к файлу из базы
 * @param {import('express').Request} [req] - текущий запрос (для построения абсолютного URL)
 * @returns {string|null}
 */
export function buildMediaUrl(filePath, req) {
  if (!filePath) {
    return filePath;
  }

  if (ABSOLUTE_URL_REGEX.test(filePath)) {
    return filePath;
  }

  const normalizedPath = filePath.replace(/^\/+/, '');
  const relativeUrl = `${mediaUrlPrefix}/${normalizedPath}`;

  const host = req?.get?.('host');

  if (!host) {
    return relativeUrl;
  }

  const forwardedProto = req?.get?.('x-forwarded-proto');
  const protocol = forwardedProto?.split?.(',')?.[0]?.trim() || req.protocol || 'http';
  const baseUrl = `${protocol}://${host}`;

  return new URL(relativeUrl, baseUrl).toString();
}
