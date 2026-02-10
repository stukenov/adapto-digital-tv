'use strict';

const { getRuntimeConfig } = require('../config/runtimeConfig');

function getVideoExtensionsSet() {
  const runtimeConfig = getRuntimeConfig();
  const list = Array.isArray(runtimeConfig.constants.videoExtensions)
    ? runtimeConfig.constants.videoExtensions
    : [];
  const normalized = list
    .map((ext) => {
      if (typeof ext !== 'string') {
        return null;
      }
      let value = ext.trim().toLowerCase();
      if (!value) {
        return null;
      }
      if (!value.startsWith('.')) {
        value = `.${value}`;
      }
      return value;
    })
    .filter(Boolean);
  return new Set(normalized);
}

function getBroadcastWindowSeconds() {
  const runtimeConfig = getRuntimeConfig();
  const value = Number(runtimeConfig.constants.broadcastWindowSeconds);
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return 24 * 60 * 60 - 60;
}

module.exports = {
  getVideoExtensionsSet,
  getBroadcastWindowSeconds
};

Object.defineProperty(module.exports, 'VIDEO_EXTENSIONS', {
  enumerable: true,
  get: () => getVideoExtensionsSet()
});

Object.defineProperty(module.exports, 'BROADCAST_WINDOW_SECONDS', {
  enumerable: true,
  get: () => getBroadcastWindowSeconds()
});
