'use strict';

function parseFraction(value) {
  if (typeof value !== 'string' || !value) {
    return null;
  }

  if (value.includes('/')) {
    const [numStr, denStr] = value.split('/');
    const num = Number(numStr);
    const den = Number(denStr);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return null;
    }
    return num / den;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

module.exports = {
  parseFraction
};
