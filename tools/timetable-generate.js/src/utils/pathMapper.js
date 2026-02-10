'use strict';

const path = require('path');

class PathMapper {
  constructor(mapFrom, mapTo) {
    this.mapFrom = mapFrom ? path.resolve(mapFrom) : '';
    this.mapTo = mapTo ? path.resolve(mapTo) : '';
  }

  map(originalPath) {
    if (!this.mapFrom || !this.mapTo) {
      return this.toPosix(originalPath);
    }

    const normalizedFrom = path.normalize(this.mapFrom);
    const normalizedPath = path.normalize(originalPath);

    if (this.isWithin(normalizedPath, normalizedFrom)) {
      const relative = path.relative(normalizedFrom, normalizedPath);
      const mapped = path.join(this.mapTo, relative);
      return this.toPosix(mapped);
    }

    return this.toPosix(originalPath);
  }

  isWithin(targetPath, basePath) {
    if (!path.isAbsolute(basePath)) {
      return targetPath.startsWith(basePath);
    }

    if (!path.isAbsolute(targetPath)) {
      return false;
    }

    const relative = path.relative(basePath, targetPath);
    if (relative === '') {
      return true;
    }
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  toPosix(value) {
    return value.split(path.sep).join('/');
  }
}

module.exports = {
  PathMapper
};
