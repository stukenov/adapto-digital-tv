'use strict';

const { getRuntimeConfig } = require('./runtimeConfig');

const FLAG_DEFINITIONS = new Map([
  ['c', { key: 'channel', type: 'string' }],
  ['d', { key: 'date', type: 'string' }],
  ['dir', { key: 'directory', type: 'string' }],
  ['r', { key: 'recursive', type: 'boolean' }],
  ['fl', { key: 'filelist', type: 'string' }],
  ['o', { key: 'output', type: 'string' }],
  ['no-abs', { key: 'noAbs', type: 'boolean' }],
  ['lang', { key: 'lang', type: 'string' }],
  ['m', { key: 'maxItems', type: 'integer' }],
  ['p', { key: 'period', type: 'string' }],
  ['w', { key: 'week', type: 'integer' }],
  ['y', { key: 'year', type: 'integer' }],
  ['prev', { key: 'prev', type: 'string' }],
  ['series', { key: 'useSeries', type: 'boolean' }],
  ['episodes', { key: 'episodesPerDay', type: 'integer' }],
  ['timeslots', { key: 'useTimeSlots', type: 'boolean' }],
  ['api', { key: 'apiMode', type: 'boolean' }],
  ['port', { key: 'port', type: 'string' }],
  ['map-from', { key: 'mapFrom', type: 'string' }],
  ['map-to', { key: 'mapTo', type: 'string' }],
  ['age-rating', { key: 'ageRatingFile', type: 'string' }]
]);

function getDefaultConfig() {
  const runtimeConfig = getRuntimeConfig();
  return { ...runtimeConfig.defaults };
}

function createConfig(argv) {
  const defaults = getDefaultConfig();
  const config = { ...defaults };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith('-')) {
      positional.push(raw);
      continue;
    }

    const trimmed = raw.replace(/^-+/, '');
    const [flagName, inlineValue] = trimmed.split('=');
    const definition = FLAG_DEFINITIONS.get(flagName);

    if (!definition) {
      throw new Error(`Неизвестный флаг: ${raw}`);
    }

    let value = inlineValue;
    if (definition.type === 'boolean') {
      if (value === undefined) {
        value = 'true';
      }
      config[definition.key] = parseBoolean(value, raw);
      continue;
    }

    if (value === undefined) {
      i += 1;
      if (i >= argv.length) {
        throw new Error(`Флаг ${raw} требует значения`);
      }
      value = argv[i];
    }

    if (definition.type === 'integer') {
      config[definition.key] = parseInteger(value, raw);
    } else {
      config[definition.key] = value;
    }
  }

  return { ...config, positional };
}

function parseBoolean(value, source) {
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Значение ${value} для ${source} не является булевым`);
}

function parseInteger(value, source) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Значение ${value} для ${source} не является числом`);
  }
  return parsed;
}

module.exports = {
  createConfig,
  getDefaultConfig
};
