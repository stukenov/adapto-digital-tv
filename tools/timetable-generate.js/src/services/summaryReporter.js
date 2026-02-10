'use strict';

const path = require('path');

class SummaryReporter {
  calculate(cache, playlists) {
    const summary = {
      totalFiles: cache.length,
      totalFolders: 0,
      uniqueFiles: 0,
      repeatPercentage: 0,
      uniquenessPercent: 0,
      unusedFiles: 0,
      unusedDuration: 0,
      totalDuration: 0,
      usedDuration: 0
    };

    const folderSet = new Set();
    cache.forEach((item) => {
      summary.totalDuration += item.duration;
      const dir = path.dirname(item.sourcePath);
      if (dir !== '.') {
        folderSet.add(dir);
      }
    });
    summary.totalFolders = folderSet.size;

    const usageMap = new Map();
    playlists.forEach((playlist) => {
      playlist.program.forEach((program) => {
        const count = usageMap.get(program.source) || 0;
        usageMap.set(program.source, count + 1);
        summary.usedDuration += program.duration;
      });
    });

    summary.uniqueFiles = usageMap.size;
    summary.unusedFiles = summary.totalFiles - summary.uniqueFiles;
    summary.unusedDuration = summary.totalDuration - summary.usedDuration;

    let totalUsages = 0;
    usageMap.forEach((count) => {
      totalUsages += count;
    });

    if (summary.uniqueFiles > 0 && totalUsages > 0) {
      summary.repeatPercentage = ((totalUsages - summary.uniqueFiles) / totalUsages) * 100;
      summary.uniquenessPercent = (summary.uniqueFiles / summary.totalFiles) * 100;
    }

    return summary;
  }

  print(summary, lang = 'ru') {
    const linesRu = [
      '=== 📊 Сводка генерации ===',
      `📁 Всего файлов: ${summary.totalFiles}`,
      `📂 Всего папок: ${summary.totalFolders}`,
      `✨ Уникальных файлов использовано: ${summary.uniqueFiles}`,
      `🔄 Повторов: ${summary.repeatPercentage.toFixed(1)}%`,
      `💎 Уникальность: ${summary.uniquenessPercent.toFixed(1)}%`,
      `📋 Неиспользованных файлов: ${summary.unusedFiles}`,
      `⏱️  Общая длительность: ${(summary.totalDuration / 3600).toFixed(1)} часов`,
      `✅ Использовано: ${(summary.usedDuration / 3600).toFixed(1)} часов`,
      `❌ Не распределено: ${(summary.unusedDuration / 3600).toFixed(1)} часов`,
      '======================================='
    ];

    const linesKk = [
      '=== 📊 Генерация туралы есеп ===',
      `📁 Барлық файлдар: ${summary.totalFiles}`,
      `📂 Барлық қалталар: ${summary.totalFolders}`,
      `✨ Бірегей файлдар пайдаланылды: ${summary.uniqueFiles}`,
      `🔄 Қайталаулар: ${summary.repeatPercentage.toFixed(1)}%`,
      `💎 Бірегейлік: ${summary.uniquenessPercent.toFixed(1)}%`,
      `📋 Пайдаланылмаған файлдар: ${summary.unusedFiles}`,
      `⏱️  Жалпы ұзақтық: ${(summary.totalDuration / 3600).toFixed(1)} сағат`,
      `✅ Пайдаланылды: ${(summary.usedDuration / 3600).toFixed(1)} сағат`,
      `❌ Бөлінбеген: ${(summary.unusedDuration / 3600).toFixed(1)} сағат`,
      '======================================='
    ];

    const lines = lang === 'kk' ? linesKk : linesRu;
    lines.forEach((line) => {
      process.stderr.write(`${line}\n`);
    });
  }
}

module.exports = {
  SummaryReporter
};
