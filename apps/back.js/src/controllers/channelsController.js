import { query, queryOne } from '../db/database.js';
import { sendSuccess, sendNotFound, sendError } from '../utils/response.js';
import { buildMediaUrl } from '../utils/media.js';
import { getCurrentDate, getDayBounds, formatDatetime } from '../utils/date.js';

/**
 * Получить список всех активных каналов
 * GET /api/v1/tvchannels/
 */
export async function getChannels(req, res, next) {
  try {
    const sql = `
      SELECT
        id,
        name,
        slug,
        is_active,
        logo,
        description,
        stream_url,
        sort_order,
        created_at,
        updated_at
      FROM tvchannels_channel
      WHERE is_active = TRUE
      ORDER BY sort_order DESC, name ASC
    `;

    const channels = await query(sql);

    // Форматируем данные в формат, ожидаемый фронтендом
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      is_active: Boolean(channel.is_active),
      logo: buildMediaUrl(channel.logo, req),
      description: channel.description,
      stream_url: channel.stream_url,
      sort_order: channel.sort_order,
      created_at: formatDatetime(channel.created_at),
      updated_at: formatDatetime(channel.updated_at)
    }));

    sendSuccess(res, formattedChannels);
  } catch (err) {
    next(err);
  }
}

/**
 * Получить детали канала по slug
 * GET /api/v1/tvchannels/:slug/
 */
export async function getChannelBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const sql = `
      SELECT
        id,
        name,
        slug,
        is_active,
        logo,
        description,
        stream_url,
        sort_order,
        created_at,
        updated_at
      FROM tvchannels_channel
      WHERE slug = ? AND is_active = TRUE
      LIMIT 1
    `;

    const channel = await queryOne(sql, [slug]);

    if (!channel) {
      return sendNotFound(res, 'Channel not found');
    }

    // Форматируем данные
    const formattedChannel = {
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      is_active: Boolean(channel.is_active),
      logo: buildMediaUrl(channel.logo, req),
      description: channel.description,
      stream_url: channel.stream_url,
      sort_order: channel.sort_order,
      created_at: formatDatetime(channel.created_at),
      updated_at: formatDatetime(channel.updated_at)
    };

    sendSuccess(res, formattedChannel);
  } catch (err) {
    next(err);
  }
}

/**
 * Получить расписание канала на дату
 * GET /api/v1/tvchannels/:slug/schedule/?date=YYYY-MM-DD
 */
export async function getChannelSchedule(req, res, next) {
  try {
    const { slug } = req.params;
    const dateString = req.query.date || getCurrentDate();

    // Сначала получаем канал
    const channelSql = `
      SELECT id, name
      FROM tvchannels_channel
      WHERE slug = ? AND is_active = TRUE
      LIMIT 1
    `;

    const channel = await queryOne(channelSql, [slug]);

    if (!channel) {
      return sendNotFound(res, 'Channel not found');
    }

    // Получаем границы дня
    const { start, end } = getDayBounds(dateString);

    // Получаем программы на этот день
    const programsSql = `
      SELECT
        id,
        name,
        description,
        start_time,
        end_time,
        duration
      FROM tvchannels_program
      WHERE channel_id = ?
        AND start_time >= ?
        AND start_time < ?
      ORDER BY start_time ASC
    `;

    const programs = await query(programsSql, [channel.id, start, end]);

    // Форматируем данные в формат, ожидаемый фронтендом
    const formattedPrograms = programs.map(program => ({
      id: program.id,
      channel_name: channel.name,
      name: program.name,
      description: program.description,
      start_time: formatDatetime(program.start_time),
      end_time: formatDatetime(program.end_time),
      duration: program.duration
    }));

    sendSuccess(res, formattedPrograms);
  } catch (err) {
    next(err);
  }
}
