'use strict';

class PlaylistBuilder {
  constructor({ ageRating, roundingMinutes }) {
    this.ageRating = ageRating;
    const rounded = Number.isFinite(roundingMinutes) && roundingMinutes > 0 ? Math.round(roundingMinutes) : 5;
    this.roundingMinutes = rounded;
  }

  buildFromCache({ channel, date, cacheItems, maxDuration, startIndex = 0 }) {
    if (!Array.isArray(cacheItems) || cacheItems.length === 0) {
      return this.createPlaylist(channel, date, []);
    }

    const items = [];
    let accumulated = 0;
    const totalItems = cacheItems.length;
    let index = totalItems > 0 ? startIndex % totalItems : 0;
    if (index < 0) {
      index = 0;
    }

    while (totalItems > 0) {
      if (typeof maxDuration === 'number' && accumulated >= maxDuration) {
        break;
      }

      const item = cacheItems[index];
      const ratingDuration = this.ageRating ? this.ageRating.duration : 0;
      const totalDuration = item.duration + ratingDuration;

      if (typeof maxDuration === 'number' && accumulated + totalDuration > maxDuration) {
        break;
      }

      if (this.ageRating) {
        items.push({
          in: accumulated,
          out: accumulated + ratingDuration,
          duration: ratingDuration,
          source: this.ageRating.sourcePath,
          startMinutePretty: ''
        });
        accumulated += ratingDuration;
      }

      items.push({
        in: accumulated,
        out: accumulated + item.duration,
        duration: item.duration,
        source: item.sourcePath,
        startMinutePretty: ''
      });

      accumulated += item.duration;
      index = (index + 1) % totalItems;

      if (totalItems === 1 && (item.duration <= 0 || (typeof maxDuration === 'number' && totalDuration > maxDuration))) {
        break;
      }
    }

    return this.createPlaylist(channel, date, items);
  }

  createPlaylist(channel, date, program) {
    return {
      channel,
      date,
      program
    };
  }

  addHumanReadableTimes(playlist, baseStart) {
    if (!playlist || !Array.isArray(playlist.program)) {
      return playlist;
    }

    const roundingStep = this.roundingMinutes > 0 ? this.roundingMinutes : 5;
    const updatedProgram = playlist.program.map((item) => {
      const startDate = new Date(baseStart.getTime() + item.in * 1000);
      const minute = Math.floor(startDate.getMinutes() / roundingStep) * roundingStep;
      const pretty = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), minute, 0, 0);
      return {
        ...item,
        startMinutePretty: formatDate(pretty)
      };
    });

    return {
      ...playlist,
      program: updatedProgram
    };
  }
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

module.exports = {
  PlaylistBuilder
};
