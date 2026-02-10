#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { createConfig } = require('./config/cliConfig');
const { getRuntimeConfig } = require('./config/runtimeConfig');
const { resolveMessages } = require('./locales/messages');
const { MediaScanner, deduplicatePreserveOrder } = require('./utils/fileScanner');
const { PathMapper } = require('./utils/pathMapper');
const { FFProbeClient } = require('./services/ffprobeClient');
const { MediaCacheBuilder } = require('./services/mediaCacheBuilder');
const { AgeRatingManager } = require('./services/ageRatingManager');
const { DatePlanner } = require('./services/datePlanner');
const { WeeklyScheduler } = require('./services/weeklyScheduler');
const { PlaylistBuilder } = require('./services/playlistBuilder');
const { SummaryReporter } = require('./services/summaryReporter');
const { OutputWriter } = require('./services/outputWriter');
const { getBroadcastWindowSeconds } = require('./constants/media');

async function main() {
  let config;
  try {
    config = createConfig(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }

  if (config.apiMode) {
    process.stderr.write('🚀 API режим перенесен в отдельную программу!\n');
    process.stderr.write(`📱 Используйте: node ttb-gen-api.js -port ${config.port}\n`);
    process.exit(1);
  }

  const runtimeConfig = getRuntimeConfig();
  const messages = resolveMessages(config.lang);
  const ffprobe = new FFProbeClient({
    binary: runtimeConfig.ffprobe.binary,
    fallbackFps: runtimeConfig.ffprobe.fallbackFps
  });
  const available = await ffprobe.ensureAvailable();
  if (!available) {
    process.stderr.write(`${messages.ffprobeMissing}\n`);
    process.exit(1);
  }

  const scanner = new MediaScanner();
  const pathMapper = new PathMapper(config.mapFrom, config.mapTo);
  const mediaCacheBuilder = new MediaCacheBuilder({
    ffprobeClient: ffprobe,
    pathMapper,
    resolveAbsolutePaths: !config.noAbs
  });
  const ageRatingManager = new AgeRatingManager({
    ffprobeClient: ffprobe,
    pathMapper,
    resolveAbsolutePaths: !config.noAbs
  });

  const allInputs = [];
  const fromDirectory = await scanner.collectFromDirectory(config.directory, config.recursive);
  allInputs.push(...fromDirectory);

  const fromFileList = await scanner.collectFromFileList(config.filelist);
  allInputs.push(...fromFileList);

  for (const item of config.positional) {
    const stat = await fs.promises.stat(item).catch(() => null);
    if (stat && stat.isFile() && scanner.isVideoFile(item)) {
      allInputs.push(item);
    }
  }

  const filteredInputs = deduplicatePreserveOrder(allInputs).slice(0, config.maxItems > 0 ? config.maxItems : undefined);

  process.stderr.write(`${messages.collecting}\n`);
  const cache = await mediaCacheBuilder.buildCache(filteredInputs);
  const ageRating = await ageRatingManager.prepare(config.ageRatingFile);

  const planner = new DatePlanner({
    period: config.period,
    date: config.date,
    week: config.week,
    year: config.year,
    broadcastDayBoundaryHour: runtimeConfig.constants.baseStartHour,
    daysPerPeriod: runtimeConfig.scheduler.daysPerWeek
  });
  const dateStrings = planner.resolveDates(new Date());

  const scheduler = new WeeklyScheduler({
    episodesPerDay: config.episodesPerDay,
    useTimeSlots: config.useSeries ? config.useTimeSlots : false,
    daysPerWeek: runtimeConfig.scheduler.daysPerWeek,
    timeSlots: runtimeConfig.scheduler.timeSlots,
    balanceConfig: runtimeConfig.scheduler.balance
  });

  const playlistBuilder = new PlaylistBuilder({
    ageRating,
    roundingMinutes: runtimeConfig.constants.timeRoundingMinutes
  });
  const baseStartHour = runtimeConfig.constants.baseStartHour;
  const broadcastWindowSeconds = getBroadcastWindowSeconds();
  const playlists = [];

  let weeklyDistribution = null;
  if (config.period === 'week' && config.useSeries) {
    weeklyDistribution = scheduler.createDistribution(cache);
  }

  dateStrings.forEach((dateStr, dayIndex) => {
    const baseStart = new Date(`${dateStr}T00:00:00`);
    baseStart.setHours(baseStartHour);

    let dayCache = cache;
    if (weeklyDistribution) {
      dayCache = weeklyDistribution[dayIndex] || [];
    }

    const playlist = playlistBuilder.buildFromCache({
      channel: config.channel,
      date: dateStr,
      cacheItems: dayCache,
      maxDuration: broadcastWindowSeconds,
      startIndex: 0
    });

    const withTimes = playlistBuilder.addHumanReadableTimes(playlist, baseStart);
    playlists.push(withTimes);
  });

  const summaryReporter = new SummaryReporter();
  const summary = summaryReporter.calculate(cache, playlists);

  process.stderr.write(`${messages.writing}\n`);
  const outputWriter = new OutputWriter();
  await outputWriter.write(playlists, config.output);
  process.stderr.write(`${messages.summary}\n`);
  summaryReporter.print(summary, config.lang);
}

main().catch((error) => {
  process.stderr.write(`Ошибка: ${error.message}\n`);
  process.exit(1);
});
