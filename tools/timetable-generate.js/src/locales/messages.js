'use strict';

const MESSAGES = {
  ru: {
    ffprobeMissing: 'Не найден ffprobe. Установите FFmpeg/ffprobe и добавьте в PATH.',
    collecting: 'Сбор длительности файлов...',
    writing: 'Запись плейлиста...',
    summary: 'Генерация завершена.'
  },
  kk: {
    ffprobeMissing: 'ffprobe табылмады. FFmpeg/ffprobe орнатып, PATH-қа қосыңыз.',
    collecting: 'Файлдардың ұзақтығын жинау...',
    writing: 'Плейлист жазылуда...',
    summary: 'Генерация аяқталды.'
  }
};

function resolveMessages(lang) {
  return MESSAGES[lang] || MESSAGES.ru;
}

module.exports = {
  resolveMessages
};
