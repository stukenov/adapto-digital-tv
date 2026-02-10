#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ====================================
// Конфигурация
// ====================================
const TARGET_BITRATE_MBPS = 2; // целевой битрейт транскодирования
const TARGET_BITRATE_KBPS = TARGET_BITRATE_MBPS * 1000;
const TRANSCODE_THRESHOLD_MBPS = 3; // порог, выше которого нужно транскодировать
const TRANSCODE_THRESHOLD_KBPS = TRANSCODE_THRESHOLD_MBPS * 1000;
const AUDIO_BITRATE = '128k';
const VIDEO_CODEC = 'h264_nvenc';
const AUDIO_CODEC = 'aac';

// ====================================
// Вспомогательные функции
// ====================================

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function isVideoFile(filePath) {
  const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv', '.wmv', '.mpg', '.mpeg', '.mxf'];
  const ext = path.extname(filePath).toLowerCase();
  return videoExtensions.includes(ext);
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function getVideoBitrate(filePath) {
  try {
    log(`Анализирую битрейт файла: ${filePath}`);

    const command = `ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const result = execSync(command, { encoding: 'utf8' }).trim();

    if (!result || result === 'N/A') {
      log(`Битрейт не найден напрямую, рассчитываю из размера файла`);
      return calculateBitrateFromFileSize(filePath);
    }

    const bitrateKbps = parseInt(result) / 1000;
    log(`Битрейт: ${bitrateKbps.toFixed(2)} kbps`);
    return bitrateKbps;

  } catch (error) {
    log(`Ошибка при получении битрейта: ${error.message}`);
    return calculateBitrateFromFileSize(filePath);
  }
}

function calculateBitrateFromFileSize(filePath) {
  try {
    const fileSizeBytes = fs.statSync(filePath).size;
    const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const durationSeconds = parseFloat(execSync(durationCommand, { encoding: 'utf8' }).trim());

    if (durationSeconds > 0) {
      const bitrateKbps = (fileSizeBytes * 8) / (durationSeconds * 1000);
      log(`Рассчитанный битрейт: ${bitrateKbps.toFixed(2)} kbps`);
      return bitrateKbps;
    }
  } catch (error) {
    log(`Не удалось рассчитать битрейт: ${error.message}`);
  }
  return 0;
}

function transcodeVideo(inputPath, outputPath) {
  try {
    log(`Начинаю транскодирование: ${inputPath} -> ${outputPath}`);

    const command = `ffmpeg -hide_banner -loglevel error -stats -y -i "${inputPath}" -c:v ${VIDEO_CODEC} -b:v ${TARGET_BITRATE_KBPS}k -c:a ${AUDIO_CODEC} -b:a ${AUDIO_BITRATE} -movflags +faststart "${outputPath}"`;

    execSync(command, { stdio: 'inherit' });

    log(`Транскодирование завершено: ${outputPath}`);
    return true;

  } catch (error) {
    log(`Ошибка при транскодировании: ${error.message}`);
    return false;
  }
}

// Получение кодеков первого видео- и аудиопотоков
function getStreamCodecs(filePath) {
  let videoCodec = '';
  let audioCodec = '';
  try {
    const vCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`;
    videoCodec = execSync(vCmd, { encoding: 'utf8' }).trim().toLowerCase();
  } catch (_) {}
  try {
    const aCmd = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`;
    audioCodec = execSync(aCmd, { encoding: 'utf8' }).trim().toLowerCase();
  } catch (_) {}
  log(`Кодеки: video=${videoCodec || 'n/a'}, audio=${audioCodec || 'n/a'}`);
  return { videoCodec, audioCodec };
}

// Ремультиплексирование в MP4 без перекодирования видео (если возможно)
function remuxCopyVideoToMp4(inputPath, outputPath, audioCodec) {
  try {
    log(`Пытаюсь ремультиплексировать (copy video) в MP4: ${inputPath} -> ${outputPath}`);

    // Определяем стратегию для аудио: copy если AAC, иначе перекодировать в AAC, если нет аудио — удалить (-an)
    let audioArgs = '-c:a aac -b:a ' + AUDIO_BITRATE;
    if (!audioCodec) {
      audioArgs = '-an';
    } else if (audioCodec === 'aac') {
      audioArgs = '-c:a copy';
    }

    const command = `ffmpeg -hide_banner -loglevel error -stats -y -i "${inputPath}" -c:v copy ${audioArgs} -movflags +faststart "${outputPath}"`;
    execSync(command, { stdio: 'inherit' });
    log(`Ремультиплексирование завершено: ${outputPath}`);
    return true;
  } catch (error) {
    log(`Ошибка при ремультиплексировании: ${error.message}`);
    return false;
  }
}

function processVideoFile(sourcePath) {
  // Проверяем существование файла
  if (!fileExists(sourcePath)) {
    log(`Файл не найден: ${sourcePath}`);
    return sourcePath;
  }

  // Проверяем, является ли файл видео
  if (!isVideoFile(sourcePath)) {
    log(`Пропускаю (не видео): ${sourcePath}`);
    return sourcePath;
  }

  log(`Обрабатываю: ${sourcePath}`);

  // Получаем информацию о файле
  const dir = path.dirname(sourcePath);
  const ext = path.extname(sourcePath);
  const nameWithoutExt = path.basename(sourcePath, ext);
  const isMP4 = ext.toLowerCase() === '.mp4';

  // Проверяем битрейт
  const bitrateKbps = getVideoBitrate(sourcePath);
  const needsTranscode = bitrateKbps > TRANSCODE_THRESHOLD_KBPS;

  // Если битрейт нормальный и файл уже MP4, ничего не делаем
  if (!needsTranscode && isMP4) {
    log(`Файл в норме (<= ${TRANSCODE_THRESHOLD_MBPS} Mbps) и уже MP4, пропускаю: ${sourcePath}`);
    return sourcePath;
  }

  // Определяем путь для выходного файла
  const outputPath = isMP4
    ? sourcePath
    : path.join(dir, `${nameWithoutExt}.mp4`);

  const tempPath = path.join(dir, `${nameWithoutExt}_temp.mp4`);

  let success = false;

  if (isMP4 || needsTranscode) {
    // Перекодируем (видео выше порога или уже MP4 и требует перекодирования)
    success = transcodeVideo(sourcePath, tempPath);
  } else {
    // Файл не MP4 и битрейт ниже/равен порогу — пробуем ремультиплексировать без перекодирования видео, если это H.264
    const { videoCodec, audioCodec } = getStreamCodecs(sourcePath);
    if (videoCodec === 'h264') {
      success = remuxCopyVideoToMp4(sourcePath, tempPath, audioCodec);
      if (!success) {
        // Фолбэк: полное перекодирование, если ремультиплексирование не удалось
        success = transcodeVideo(sourcePath, tempPath);
      }
    } else {
      // Видео- кодек не H.264 — перекодируем в H.264
      success = transcodeVideo(sourcePath, tempPath);
    }
  }

  if (!success) {
    log(`Не удалось транскодировать файл: ${sourcePath}`);
    return sourcePath;
  }

  // Если исходный файл был MP4, заменяем его
  if (isMP4) {
    try {
      fs.unlinkSync(sourcePath);
      fs.renameSync(tempPath, outputPath);
      log(`Заменил исходный MP4 файл: ${outputPath}`);
      return outputPath;
    } catch (error) {
      log(`Ошибка при замене файла: ${error.message}`);
      return sourcePath;
    }
  }

  // Если исходный файл был не MP4
  try {
    fs.unlinkSync(sourcePath);
    fs.renameSync(tempPath, outputPath);
    log(`Удалил исходник и создал MP4: ${outputPath}`);
    return outputPath;
  } catch (error) {
    log(`Ошибка при замене файла: ${error.message}`);
    return sourcePath;
  }
}

// ====================================
// Основная логика
// ====================================

function processJSON(jsonFilePath) {
  log(`Начинаю обработку файла: ${jsonFilePath}`);

  // Читаем JSON
  let data;
  try {
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    data = JSON.parse(jsonContent);
  } catch (error) {
    log(`Ошибка при чтении JSON: ${error.message}`);
    process.exit(1);
  }

  // Проверяем наличие массива program
  if (!data.program || !Array.isArray(data.program)) {
    log(`В JSON нет массива program`);
    process.exit(1);
  }

  log(`Найдено элементов для обработки: ${data.program.length}`);

  // Обрабатываем каждый элемент
  let processed = 0;
  let skipped = 0;
  let duplicateUpdates = 0;
  let brokenLinks = 0;

  for (let i = 0; i < data.program.length; i++) {
    const item = data.program[i];

    log(`\n========== Элемент ${i + 1}/${data.program.length} ==========`);

    if (!item.source) {
      log(`Нет поля source, пропускаю`);
      skipped++;
      continue;
    }

    const originalSource = item.source;

    // Пропускаем URL
    if (originalSource.startsWith('http://') || originalSource.startsWith('https://')) {
      log(`Пропускаю URL: ${originalSource}`);
      skipped++;
      continue;
    }

    // Обрабатываем видео файл
    const newSource = processVideoFile(originalSource);

    // Если путь изменился после транскодирования — обновляем ВСЕ вхождения
    if (newSource !== originalSource) {
      let updatedCount = 0;
      for (let j = 0; j < data.program.length; j++) {
        if (data.program[j] && data.program[j].source === originalSource) {
          data.program[j].source = newSource;
          updatedCount++;
        }
      }
      duplicateUpdates += Math.max(0, updatedCount - 1); // кроме текущего
      processed++;
      log(`Обновлены все ссылки на файл: ${originalSource} -> ${newSource} (замен: ${updatedCount})`);

      // Немедленно сохраняем плейлист после каждого изменения ссылок
      try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 4), 'utf8');
        log(`JSON частично обновлен (после элемента ${i + 1}): ${jsonFilePath}`);
      } catch (error) {
        log(`Ошибка при сохранении JSON после элемента ${i + 1}: ${error.message}`);
      }
    } else {
      skipped++;
    }

    // После обработки проверяем, что ссылка(и) теперь рабочие
    const existsNow = fileExists(newSource);
    if (!existsNow) {
      brokenLinks++;
      log(`ВНИМАНИЕ: Файл не найден после обработки: ${newSource}`);
    } else {
      log(`OK: Ссылка рабочая: ${newSource}`);
    }
  }

  // Сохраняем обновленный JSON
  try {
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 4), 'utf8');
    log(`\nJSON обновлен: ${jsonFilePath}`);
  } catch (error) {
    log(`Ошибка при сохранении JSON: ${error.message}`);
    process.exit(1);
  }

  log(`\n========== Итого ==========`);
  log(`Обработано: ${processed}`);
  log(`Пропущено: ${skipped}`);
  log(`Обновлено дублей ссылок: ${duplicateUpdates}`);
  log(`Проблемных ссылок после обработки: ${brokenLinks}`);
  log(`Всего: ${data.program.length}`);
  log(`Готово!`);
}

// ====================================
// Точка входа
// ====================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Использование: node index.js <путь-к-json-файлу>');
    console.log('Пример: node index.js example.json');
    process.exit(1);
  }

  const jsonFilePath = args[0];

  if (!fileExists(jsonFilePath)) {
    log(`Файл не найден: ${jsonFilePath}`);
    process.exit(1);
  }

  processJSON(jsonFilePath);
}

// Экспортируем функции для повторного использования в батч-скриптах
module.exports = {
  processJSON,
};

// Запускаем CLI только если файл запущен напрямую
if (require.main === module) {
  main();
}
