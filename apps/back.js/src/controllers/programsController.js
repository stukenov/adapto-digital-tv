import { query, queryOne } from '../db/database.js';
import { sendSuccess, sendNotFound, sendError } from '../utils/response.js';
import { getDayBounds, formatDatetime } from '../utils/date.js';

/**
 * Получить список программ с фильтрацией
 * GET /api/v1/programs/?channel=id&date=YYYY-MM-DD
 */
export async function getPrograms(req, res, next) {
  try {
    const { channel, date } = req.query;

    let sql = `
      SELECT
        p.id,
        p.channel_id as channel,
        c.name as channel_name,
        p.name,
        p.description,
        p.start_time,
        p.end_time,
        p.duration
      FROM tvchannels_program p
      INNER JOIN tvchannels_channel c ON p.channel_id = c.id
      WHERE 1=1
    `;

    const params = [];

    // Фильтр по каналу
    if (channel) {
      sql += ' AND p.channel_id = ?';
      params.push(channel);
    }

    // Фильтр по дате
    if (date) {
      const { start, end } = getDayBounds(date);
      sql += ' AND p.start_time >= ? AND p.start_time < ?';
      params.push(start, end);
    }

    sql += ' ORDER BY p.start_time ASC';

    const programs = await query(sql, params);

    // Форматируем данные
    const formattedPrograms = programs.map(program => ({
      id: program.id,
      channel: program.channel,
      channel_name: program.channel_name,
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

/**
 * Получить детали программы по ID
 * GET /api/v1/programs/:id/
 */
export async function getProgramById(req, res, next) {
  try {
    const { id } = req.params;

    const sql = `
      SELECT
        p.id,
        p.channel_id as channel,
        c.name as channel_name,
        p.name,
        p.description,
        p.start_time,
        p.end_time,
        p.duration
      FROM tvchannels_program p
      INNER JOIN tvchannels_channel c ON p.channel_id = c.id
      WHERE p.id = ?
      LIMIT 1
    `;

    const program = await queryOne(sql, [id]);

    if (!program) {
      return sendNotFound(res, 'Program not found');
    }

    // Форматируем данные
    const formattedProgram = {
      id: program.id,
      channel: program.channel,
      channel_name: program.channel_name,
      name: program.name,
      description: program.description,
      start_time: formatDatetime(program.start_time),
      end_time: formatDatetime(program.end_time),
      duration: program.duration
    };

    sendSuccess(res, formattedProgram);
  } catch (err) {
    next(err);
  }
}
