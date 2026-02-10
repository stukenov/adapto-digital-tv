'use strict';

const fs = require('fs');
const path = require('path');

class OutputWriter {
  async write(playlists, targetPath) {
    if (!Array.isArray(playlists) || playlists.length === 0) {
      return;
    }

    if (playlists.length === 1) {
      await this.writeSingle(playlists[0], targetPath);
      return;
    }

    await this.writeMultiple(playlists, targetPath);
  }

  async writeSingle(playlist, targetPath) {
    const json = JSON.stringify(playlist, null, 2);
    if (targetPath) {
      const stat = await fs.promises.stat(targetPath).catch(() => null);
      let filePath = targetPath;
      if (stat && stat.isDirectory()) {
        filePath = await this.createDatedPath(targetPath, playlist.date);
      }
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, json, 'utf8');
      process.stderr.write(`Плейлист сохранен: ${filePath}\n`);
    }
    process.stdout.write(`${json}\n`);
  }

  async writeMultiple(playlists, targetPath) {
    const baseDir = await this.resolveBaseDirectory(targetPath);
    await fs.promises.mkdir(baseDir, { recursive: true });

    for (const playlist of playlists) {
      const filePath = await this.createDatedPath(baseDir, playlist.date);
      const json = JSON.stringify(playlist, null, 2);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, json, 'utf8');
      process.stderr.write(`Плейлист сохранен: ${filePath}\n`);
      process.stdout.write(`${json}\n`);
    }
  }

  async resolveBaseDirectory(targetPath) {
    if (!targetPath) {
      return process.cwd();
    }

    const stat = await fs.promises.stat(targetPath).catch(() => null);
    if (stat && stat.isDirectory()) {
      return targetPath;
    }

    return path.dirname(targetPath);
  }

  async createDatedPath(baseDir, dateStr) {
    const [year, month] = dateStr.split('-');
    const targetDir = path.join(baseDir, year, month);
    await fs.promises.mkdir(targetDir, { recursive: true });
    return path.join(targetDir, `${dateStr}.json`);
  }
}

module.exports = {
  OutputWriter
};
