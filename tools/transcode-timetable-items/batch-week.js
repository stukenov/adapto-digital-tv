#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { processJSON } = require('./index');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function pad2(n) {
  return n.toString().padStart(2, '0');
}

// Возвращает Date понедельника ISO-недели (week, year)
function getIsoWeekMonday(week, year) {
  const simple = new Date(Date.UTC(year, 0, 4)); // 4 Jan всегда в ISO неделе 1
  const dayOfWeek = (simple.getUTCDay() + 6) % 7; // 0=понедельник
  const mondayWeek1 = new Date(simple);
  mondayWeek1.setUTCDate(simple.getUTCDate() - dayOfWeek);
  const mondayTarget = new Date(mondayWeek1);
  mondayTarget.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return mondayTarget;
}

function getIsoWeekDates(week, year) {
  const dates = [];
  const monday = getIsoWeekMonday(week, year);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateYYYYMMDD(date) {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  return `${y}-${m}-${d}`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      if (eq !== -1) {
        const key = token.slice(2, eq);
        const val = token.slice(eq + 1);
        args[key] = val;
      } else {
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          args[key] = next; i++;
        } else {
          args[key] = 'true';
        }
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const week = parseInt(args.week || args.w || process.env.WEEK || '');
  const year = parseInt(args.year || args.y || process.env.YEAR || new Date().getUTCFullYear());
  if (!week || week < 1 || week > 53) {
    console.error('Укажите ISO-номер недели: --week 1..53');
    process.exit(1);
  }

  const start = parseInt(args.start || process.env.START || '1');
  const end = parseInt(args.end || process.env.END || '10');
  const playlistsDir = args.playlists || process.env.PLAYLISTS_DIR || '/srv/ffplayout-playlists';

  log(`Батч транскодирование за ISO-неделю ${week}, год ${year}. Каналы: ${start}-${end}. Плейлисты: ${playlistsDir}`);

  const dates = getIsoWeekDates(week, year);

  let totalFiles = 0;
  let processedFiles = 0;
  let skippedFiles = 0;

  // Сначала обрабатываем все каналы для первого дня, потом для второго и т.д.
  for (const d of dates) {
    for (let channel = start; channel <= end; channel++) {
      const yyyy = d.getUTCFullYear();
      const mm = pad2(d.getUTCMonth() + 1);
      const dateStr = formatDateYYYYMMDD(d);
      const jsonPath = path.join(playlistsDir, String(channel), String(yyyy), String(mm), `${dateStr}.json`);
      totalFiles++;
      if (!fs.existsSync(jsonPath)) {
        skippedFiles++;
        log(`Нет файла: ${jsonPath}`);
        continue;
      }
      log(`Обработка плейлиста: ${jsonPath}`);
      try {
        await Promise.resolve(processJSON(jsonPath));
        processedFiles++;
      } catch (err) {
        console.error(`Ошибка при обработке ${jsonPath}: ${err && err.message ? err.message : err}`);
      }
    }
  }

  log(`Готово. Всего: ${totalFiles}, обработано: ${processedFiles}, пропущено (нет файла): ${skippedFiles}`);
}

if (require.main === module) {
  main();
}


