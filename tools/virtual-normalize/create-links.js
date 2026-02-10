#!/usr/bin/env node

// Простой скрипт для создания символических ссылок по всем папкам. Сделан по идее для
// одного раза.

const fs = require('fs');
const path = require('path');

const USAGE = 'Usage: create-links <source_dir> <target_dir>';

process.once('uncaughtException', (error) => {
  const message = error && typeof error.message === 'string' ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createSymlinkSync(source, target) {
  const parent = path.dirname(target);
  ensureDirSync(parent);

  fs.rmSync(target, { force: true });

  const linkTarget = path.relative(parent, source) || path.basename(source);
  const type = process.platform === 'win32' ? 'file' : null;

  fs.symlinkSync(linkTarget, target, type);
}

function walkAndLink(sourceDir, targetDir) {
  ensureDirSync(targetDir);
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  entries.forEach((entry) => {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      walkAndLink(sourcePath, targetPath);
      return;
    }

    if (entry.isFile() || entry.isSymbolicLink()) {
      createSymlinkSync(sourcePath, targetPath);
    }
  });
}

function normalizePath(value) {
  return path.resolve(value);
}

function isInside(candidate, container) {
  const relative = path.relative(container, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return null;
  }

  if (argv.length !== 2) {
    fail(USAGE);
    return null;
  }

  return { source: argv[0], target: argv[1] };
}

function validateArgs(source, target) {
  const absSource = normalizePath(source);
  const absTarget = normalizePath(target);

  if (absSource === absTarget) {
    throw new Error('Source and target directories must be different.');
  }

  if (isInside(absTarget, absSource)) {
    throw new Error('Target directory must not be inside the source directory.');
  }

  if (!fs.existsSync(absSource)) {
    throw new Error(`Source directory not found: ${source}`);
  }

  const stats = fs.statSync(absSource);
  if (!stats.isDirectory()) {
    throw new Error(`Source path is not a directory: ${source}`);
  }

  return { absSource, absTarget };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    return;
  }

  const validated = validateArgs(args.source, args.target);
  walkAndLink(validated.absSource, validated.absTarget);
}

main();

