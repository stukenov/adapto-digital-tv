'use strict';

const fs = require('fs');
const path = require('path');

class MediaCacheBuilder {
  constructor({ ffprobeClient, pathMapper, resolveAbsolutePaths }) {
    this.ffprobeClient = ffprobeClient;
    this.pathMapper = pathMapper;
    this.resolveAbsolutePaths = resolveAbsolutePaths;
  }

  async buildCache(paths) {
    const cache = [];

    for (const candidate of paths) {
      const probe = await this.ffprobeClient.probe(candidate);
      if (!probe) {
        continue;
      }

      const originalPath = await this.resolvePath(candidate);
      const mappedPath = this.pathMapper.map(originalPath);

      cache.push({
        sourcePath: mappedPath,
        duration: probe.duration,
        fps: probe.fps
      });
    }

    return cache;
  }

  async resolvePath(targetPath) {
    if (!this.resolveAbsolutePaths) {
      return this.pathMapper.toPosix(targetPath);
    }

    const absolute = path.resolve(targetPath);
    try {
      const real = await fs.promises.realpath(absolute);
      return this.pathMapper.toPosix(real);
    } catch (error) {
      return this.pathMapper.toPosix(absolute);
    }
  }
}

module.exports = {
  MediaCacheBuilder
};
