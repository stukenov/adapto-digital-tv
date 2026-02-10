'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'runtime.config.json');

const DEFAULT_RUNTIME_CONFIG = {
  defaults: {
    channel: 'Channel',
    date: '',
    directory: '',
    recursive: false,
    filelist: '',
    output: '',
    noAbs: false,
    lang: 'ru',
    maxItems: 0,
    period: 'today',
    week: 0,
    year: 0,
    prev: '',
    useSeries: false,
    episodesPerDay: 4,
    useTimeSlots: true,
    apiMode: false,
    port: '8080',
    mapFrom: '',
    mapTo: '',
    ageRatingFile: ''
  },
  constants: {
    videoExtensions: [
      '.mp4',
      '.mkv',
      '.mov',
      '.avi',
      '.webm',
      '.m4v',
      '.ts',
      '.m2ts',
      '.wmv',
      '.flv',
      '.3gp'
    ],
    broadcastWindowSeconds: 24 * 60 * 60 - 60,
    baseStartHour: 6,
    timeRoundingMinutes: 5
  },
  scheduler: {
    daysPerWeek: 7,
    timeSlots: [
      { startHour: 6, endHour: 10 },
      { startHour: 10, endHour: 14 },
      { startHour: 14, endHour: 18 },
      { startHour: 18, endHour: 22 },
      { startHour: 22, endHour: 6 }
    ],
    balance: {
      attempts: 3,
      toleranceRatio: 0.2,
      maxDayAllowance: 1.1
    }
  },
  ffprobe: {
    binary: 'ffprobe',
    fallbackFps: 25
  }
};

function ensureConfigFile() {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_RUNTIME_CONFIG, null, 2));
  }
}

function readConfigFile() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function normalizeRuntimeConfig(rawConfig) {
  const normalized = JSON.parse(JSON.stringify(DEFAULT_RUNTIME_CONFIG));
  if (!rawConfig || typeof rawConfig !== 'object') {
    return normalized;
  }

  if (rawConfig.defaults && typeof rawConfig.defaults === 'object') {
    for (const [key, value] of Object.entries(rawConfig.defaults)) {
      if (!(key in normalized.defaults)) {
        continue;
      }
      normalized.defaults[key] = coerceType(normalized.defaults[key], value);
    }
  }

  if (rawConfig.constants && typeof rawConfig.constants === 'object') {
    const rawConstants = rawConfig.constants;
    if (Array.isArray(rawConstants.videoExtensions)) {
      normalized.constants.videoExtensions = rawConstants.videoExtensions
        .map((ext) => {
          if (typeof ext !== 'string') {
            return null;
          }
          let trimmed = ext.trim();
          if (!trimmed) {
            return null;
          }
          if (!trimmed.startsWith('.')) {
            trimmed = `.${trimmed}`;
          }
          return trimmed.toLowerCase();
        })
        .filter(Boolean);
    }

    if (rawConstants.broadcastWindowSeconds !== undefined) {
      const value = Number(rawConstants.broadcastWindowSeconds);
      if (Number.isFinite(value) && value > 0) {
        normalized.constants.broadcastWindowSeconds = value;
      }
    }

    if (rawConstants.baseStartHour !== undefined) {
      const value = Number(rawConstants.baseStartHour);
      if (Number.isFinite(value) && value >= 0 && value < 24) {
        normalized.constants.baseStartHour = value;
      }
    }

    if (rawConstants.timeRoundingMinutes !== undefined) {
      const value = Number(rawConstants.timeRoundingMinutes);
      if (Number.isFinite(value) && value > 0) {
        normalized.constants.timeRoundingMinutes = Math.round(value);
      }
    }
  }

  if (rawConfig.scheduler && typeof rawConfig.scheduler === 'object') {
    const rawScheduler = rawConfig.scheduler;
    if (rawScheduler.daysPerWeek !== undefined) {
      const value = Number(rawScheduler.daysPerWeek);
      if (Number.isFinite(value) && value > 0) {
        normalized.scheduler.daysPerWeek = Math.round(value);
      }
    }

    if (Array.isArray(rawScheduler.timeSlots)) {
      const slots = rawScheduler.timeSlots
        .map((slot) => {
          if (!slot || typeof slot !== 'object') {
            return null;
          }
          const start = Number(slot.startHour);
          const end = Number(slot.endHour);
          if (!Number.isFinite(start) || !Number.isFinite(end)) {
            return null;
          }
          return {
            startHour: Math.max(0, Math.min(23, Math.round(start))),
            endHour: Math.max(0, Math.min(23, Math.round(end)))
          };
        })
        .filter(Boolean);
      if (slots.length > 0) {
        normalized.scheduler.timeSlots = slots;
      }
    }

    if (rawScheduler.balance && typeof rawScheduler.balance === 'object') {
      const balance = rawScheduler.balance;
      if (balance.attempts !== undefined) {
        const value = Number(balance.attempts);
        if (Number.isFinite(value) && value >= 0) {
          normalized.scheduler.balance.attempts = Math.round(value);
        }
      }
      if (balance.toleranceRatio !== undefined) {
        const value = Number(balance.toleranceRatio);
        if (Number.isFinite(value) && value >= 0) {
          normalized.scheduler.balance.toleranceRatio = value;
        }
      }
      if (balance.maxDayAllowance !== undefined) {
        const value = Number(balance.maxDayAllowance);
        if (Number.isFinite(value) && value >= 0) {
          normalized.scheduler.balance.maxDayAllowance = value;
        }
      }
    }
  }

  if (rawConfig.ffprobe && typeof rawConfig.ffprobe === 'object') {
    const rawFfprobe = rawConfig.ffprobe;
    if (rawFfprobe.binary !== undefined) {
      normalized.ffprobe.binary = String(rawFfprobe.binary || '').trim() || normalized.ffprobe.binary;
    }
    if (rawFfprobe.fallbackFps !== undefined) {
      const value = Number(rawFfprobe.fallbackFps);
      if (Number.isFinite(value) && value > 0) {
        normalized.ffprobe.fallbackFps = value;
      }
    }
  }

  return normalized;
}

function coerceType(exampleValue, newValue) {
  const exampleType = typeof exampleValue;
  if (exampleType === 'boolean') {
    return coerceBoolean(newValue);
  }
  if (exampleType === 'number') {
    const parsed = Number(newValue);
    return Number.isFinite(parsed) ? parsed : exampleValue;
  }
  if (exampleType === 'string') {
    if (newValue === undefined || newValue === null) {
      return '';
    }
    return String(newValue);
  }
  return exampleValue;
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return Boolean(value);
}

function getRuntimeConfig() {
  ensureConfigFile();
  const raw = readConfigFile();
  return normalizeRuntimeConfig(raw);
}

function saveRuntimeConfig(nextConfig) {
  const normalized = normalizeRuntimeConfig(nextConfig);
  ensureConfigFile();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(normalized, null, 2));
  return normalized;
}

module.exports = {
  CONFIG_PATH,
  DEFAULT_RUNTIME_CONFIG,
  getRuntimeConfig,
  saveRuntimeConfig
};
