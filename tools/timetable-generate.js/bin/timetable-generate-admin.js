#!/usr/bin/env node
'use strict';

const { startAdminServer } = require('../src/admin/server');

function parseOptions(argv) {
  let port = Number(process.env.PORT) || 3000;
  let host = process.env.HOST || '0.0.0.0';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port' && argv[i + 1]) {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value)) {
        port = value;
      }
      i += 1;
      continue;
    }
    if (arg.startsWith('--port=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value)) {
        port = value;
      }
      continue;
    }
    if (arg === '--host' && argv[i + 1]) {
      host = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--host=')) {
      host = arg.split('=')[1];
    }
  }

  return { port, host };
}

const options = parseOptions(process.argv.slice(2));
startAdminServer(options).catch((error) => {
  process.stderr.write(`Ошибка запуска админ панели: ${error.message}\n`);
  process.exit(1);
});
