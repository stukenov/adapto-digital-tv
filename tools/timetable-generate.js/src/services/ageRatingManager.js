'use strict';

const path = require('path');

class AgeRatingManager {
  constructor({ ffprobeClient, pathMapper, resolveAbsolutePaths }) {
    this.ffprobeClient = ffprobeClient;
    this.pathMapper = pathMapper;
    this.resolveAbsolutePaths = resolveAbsolutePaths;
  }

  async prepare(ageRatingFile) {
    if (!ageRatingFile) {
      return null;
    }

    const probe = await this.ffprobeClient.probe(ageRatingFile);
    if (!probe) {
      return null;
    }

    let playlistPath = ageRatingFile;
    if (this.resolveAbsolutePaths) {
      playlistPath = path.resolve(ageRatingFile);
    }

    const mapped = this.pathMapper.map(playlistPath);
    return {
      duration: probe.duration,
      sourcePath: mapped
    };
  }
}

module.exports = {
  AgeRatingManager
};
