'use strict';

const { spawn } = require('child_process');
const { parseFraction } = require('../utils/number');

class FFProbeClient {
  constructor({ binary = 'ffprobe', fallbackFps = 25 } = {}) {
    this.binary = binary;
    this.fallbackFps = fallbackFps;
    this.isAvailable = null;
  }

  async ensureAvailable() {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    this.isAvailable = await new Promise((resolve) => {
      const proc = spawn(this.binary, ['-version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });

    return this.isAvailable;
  }

  async probe(filePath) {
    return new Promise((resolve) => {
      const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
      const proc = spawn(this.binary, args);

      let stdout = '';
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('error', () => resolve(null));
      proc.on('close', (code) => {
        if (code !== 0) {
          resolve(null);
          return;
        }

        try {
          const payload = JSON.parse(stdout);
          const duration = payload?.format?.duration ? Number(payload.format.duration) : null;
          if (!Number.isFinite(duration) || duration <= 0) {
            resolve(null);
            return;
          }

          const stream = Array.isArray(payload?.streams)
            ? payload.streams.find((item) => item.codec_type === 'video')
            : null;

          const frameRate = stream?.avg_frame_rate || stream?.r_frame_rate;
          const fps = frameRate ? parseFraction(frameRate) : null;

          const fallback = Number.isFinite(this.fallbackFps) && this.fallbackFps > 0 ? this.fallbackFps : 25;
          resolve({
            duration,
            fps: Number.isFinite(fps) && fps > 0 ? fps : fallback
          });
        } catch (error) {
          resolve(null);
        }
      });
    });
  }
}

module.exports = {
  FFProbeClient
};
