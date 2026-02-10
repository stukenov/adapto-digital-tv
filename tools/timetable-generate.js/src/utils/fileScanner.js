'use strict';

const fs = require('fs');
const path = require('path');
const { getVideoExtensionsSet } = require('../constants/media');

class MediaScanner {
  async collectFromDirectory(rootDir, recursive) {
    if (!rootDir) {
      return [];
    }

    const initialPath = path.resolve(rootDir);
    const stats = await fs.promises.stat(initialPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      return [];
    }

    const queue = [initialPath];
    const results = [];

    while (queue.length > 0) {
      const current = queue.shift();
      const entries = await fs.promises.readdir(current, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (recursive) {
            queue.push(entryPath);
          }
        } else if (this.isVideoFile(entryPath)) {
          results.push(entryPath);
        }
      }
    }

    return results;
  }

  async collectFromFileList(filePath) {
    if (!filePath) {
      return [];
    }

    const absolute = path.resolve(filePath);
    const content = await fs.promises.readFile(absolute, 'utf8').catch(() => null);
    if (!content) {
      return [];
    }

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  }

  isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return getVideoExtensionsSet().has(ext);
  }
}

function deduplicatePreserveOrder(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }

  return result;
}

module.exports = {
  MediaScanner,
  deduplicatePreserveOrder
};
