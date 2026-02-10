'use strict';

const path = require('path');

class WeeklyScheduler {
  constructor({ episodesPerDay, useTimeSlots, daysPerWeek, timeSlots, balanceConfig }) {
    this.episodesPerDay = episodesPerDay;
    const normalizedDays = Number.isFinite(daysPerWeek) && daysPerWeek > 0 ? Math.round(daysPerWeek) : 7;
    this.daysPerWeek = normalizedDays;
    this.timeSlotsConfig = Array.isArray(timeSlots) ? timeSlots : [];
    this.useTimeSlots = Boolean(useTimeSlots && this.timeSlotsConfig.length > 0);

    const balance = balanceConfig && typeof balanceConfig === 'object' ? balanceConfig : {};
    this.balanceAttempts = Number.isFinite(balance.attempts) && balance.attempts >= 0 ? Math.round(balance.attempts) : 3;
    this.balanceTolerance = Number.isFinite(balance.toleranceRatio) && balance.toleranceRatio >= 0 ? balance.toleranceRatio : 0.2;
    this.balanceAllowance = Number.isFinite(balance.maxDayAllowance) && balance.maxDayAllowance >= 0 ? balance.maxDayAllowance : 1.1;
  }

  createDistribution(cacheItems) {
    const days = Math.max(1, this.daysPerWeek);
    if (!Array.isArray(cacheItems) || cacheItems.length === 0) {
      return Array.from({ length: days }, () => []);
    }

    const distributor = this.groupByFolder(cacheItems);
    if (!this.useTimeSlots) {
      return this.createSimpleDistribution(distributor, days);
    }

    return this.createSlotBasedDistribution(distributor, days);
  }

  groupByFolder(cacheItems) {
    const folderMap = new Map();
    const standalone = [];

    for (const item of cacheItems) {
      const dir = path.dirname(item.sourcePath);
      const parent = path.dirname(dir);
      if (dir !== '.' && parent !== '.') {
        if (!folderMap.has(dir)) {
          folderMap.set(dir, []);
        }
        folderMap.get(dir).push(item);
      } else {
        standalone.push(item);
      }
    }

    const seriesBlocks = [];
    for (const [folderPath, episodes] of folderMap.entries()) {
      if (episodes.length > 1) {
        const totalDuration = episodes.reduce((sum, ep) => sum + ep.duration, 0);
        seriesBlocks.push({
          folderPath,
          episodes,
          totalDuration
        });
      } else if (episodes.length === 1) {
        standalone.push(episodes[0]);
      }
    }

    return {
      seriesBlocks,
      standaloneFiles: standalone
    };
  }

  createSimpleDistribution(distributor, days) {
    const distribution = Array.from({ length: days }, () => []);

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const seriesContent = this.distributeSeriesForDay(distributor.seriesBlocks, dayIndex);
      const standalone = this.distributeStandalone(distributor.standaloneFiles, dayIndex, days);
      distribution[dayIndex] = [...seriesContent, ...standalone];
    }

    return this.balanceDailyDurations(distribution);
  }

  createSlotBasedDistribution(distributor, days) {
    const distribution = Array.from({ length: days }, () => []);

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const timeSlots = this.distributeSeriesByTimeSlots(distributor.seriesBlocks, dayIndex);
      const standalone = this.distributeStandalone(distributor.standaloneFiles, dayIndex, days);
      distribution[dayIndex] = this.mergeTimeSlots(timeSlots, standalone);
    }

    return this.balanceDailyDurations(distribution);
  }

  distributeSeriesForDay(seriesBlocks, dayIndex) {
    const dayContent = [];

    for (const block of seriesBlocks) {
      const start = dayIndex * this.episodesPerDay;
      const end = Math.min(start + this.episodesPerDay, block.episodes.length);
      if (start < block.episodes.length) {
        dayContent.push(...block.episodes.slice(start, end));
      }
    }

    return dayContent;
  }

  distributeStandalone(files, dayIndex, totalDays) {
    const durationGroups = new Map();

    for (const file of files) {
      const durationKey = Math.floor(file.duration / 60);
      if (!durationGroups.has(durationKey)) {
        durationGroups.set(durationKey, []);
      }
      durationGroups.get(durationKey).push(file);
    }

    const dayFiles = [];
    let groupOffset = 0;
    const groups = Array.from(durationGroups.values());

    for (const group of groups) {
      for (let index = 0; index < group.length; index += 1) {
        const distributionIndex = totalDays > 0 ? (index + groupOffset) % totalDays : 0;
        if (distributionIndex === dayIndex) {
          dayFiles.push(group[index]);
        }
      }
      if (totalDays > 0) {
        groupOffset = (groupOffset + 1) % totalDays;
      }
    }

    return dayFiles;
  }

  distributeSeriesByTimeSlots(seriesBlocks, dayIndex) {
    const timeSlots = this.createTimeSlots();

    seriesBlocks.forEach((block, index) => {
      const slotIndex = timeSlots.length === 0 ? 0 : index % timeSlots.length;
      const start = dayIndex * this.episodesPerDay;
      const end = Math.min(start + this.episodesPerDay, block.episodes.length);
      if (start < block.episodes.length && timeSlots[slotIndex]) {
        timeSlots[slotIndex].content.push(...block.episodes.slice(start, end));
      }
    });

    return timeSlots;
  }

  createTimeSlots() {
    if (!Array.isArray(this.timeSlotsConfig) || this.timeSlotsConfig.length === 0) {
      return [];
    }

    return this.timeSlotsConfig.map((slot) => ({
      startHour: slot.startHour,
      endHour: slot.endHour,
      content: []
    }));
  }

  mergeTimeSlots(timeSlots, standaloneFiles) {
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return [...standaloneFiles];
    }

    let maxItems = 0;
    timeSlots.forEach((slot) => {
      if (Array.isArray(slot.content) && slot.content.length > maxItems) {
        maxItems = slot.content.length;
      }
    });

    standaloneFiles.forEach((file, index) => {
      const slotIndex = timeSlots.length === 0 ? 0 : index % timeSlots.length;
      if (timeSlots[slotIndex]) {
        if (!Array.isArray(timeSlots[slotIndex].content)) {
          timeSlots[slotIndex].content = [];
        }
        timeSlots[slotIndex].content.push(file);
        if (timeSlots[slotIndex].content.length > maxItems) {
          maxItems = timeSlots[slotIndex].content.length;
        }
      }
    });

    const result = [];
    for (let itemIndex = 0; itemIndex < maxItems; itemIndex += 1) {
      for (const slot of timeSlots) {
        if (Array.isArray(slot.content) && itemIndex < slot.content.length) {
          result.push(slot.content[itemIndex]);
        }
      }
    }

    return result;
  }

  balanceDailyDurations(distribution) {
    if (!Array.isArray(distribution) || distribution.length === 0) {
      return distribution;
    }

    const dailyDurations = distribution.map((day) => day.reduce((sum, item) => sum + item.duration, 0));
    const totalDuration = dailyDurations.reduce((sum, val) => sum + val, 0);
    const average = distribution.length > 0 ? totalDuration / distribution.length : 0;

    const attempts = Math.max(0, this.balanceAttempts);
    const tolerance = this.balanceTolerance;
    const allowance = this.balanceAllowance;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let maxDay = 0;
      let minDay = 0;

      for (let i = 1; i < distribution.length; i += 1) {
        if (dailyDurations[i] > dailyDurations[maxDay]) {
          maxDay = i;
        }
        if (dailyDurations[i] < dailyDurations[minDay]) {
          minDay = i;
        }
      }

      if (average === 0 || dailyDurations[maxDay] - dailyDurations[minDay] < average * tolerance) {
        break;
      }

      let moved = false;
      for (let index = 0; index < distribution[maxDay].length; index += 1) {
        const item = distribution[maxDay][index];
        const targetDuration = dailyDurations[minDay] + item.duration;
        if (targetDuration <= average * allowance) {
          distribution[minDay].push(item);
          distribution[maxDay].splice(index, 1);
          dailyDurations[maxDay] -= item.duration;
          dailyDurations[minDay] += item.duration;
          moved = true;
          break;
        }
      }

      if (!moved) {
        break;
      }
    }

    return distribution;
  }
}

module.exports = {
  WeeklyScheduler
};
