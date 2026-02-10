'use strict';

const express = require('express');
const { getRuntimeConfig, saveRuntimeConfig, CONFIG_PATH } = require('../config/runtimeConfig');

function createAdminApp() {
  const app = express();

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.get('/config', (req, res) => {
    res.json(getRuntimeConfig());
  });

  app.post('/config', (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'JSON body is required' });
      return;
    }

    const normalized = saveRuntimeConfig(req.body);
    res.json({ status: 'ok', config: normalized });
  });

  app.get('/', (req, res) => {
    const config = getRuntimeConfig();
    const html = renderFormPage(config, {
      message: req.query.message,
      error: req.query.error
    });
    res.send(html);
  });

  app.post('/save', (req, res) => {
    const rawConfig = req.body && typeof req.body.config === 'string' ? req.body.config : null;
    if (!rawConfig) {
      res.redirect('/?error=' + encodeURIComponent('Требуется JSON конфигурации'));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawConfig);
    } catch (error) {
      res.redirect('/?error=' + encodeURIComponent(`Ошибка парсинга JSON: ${error.message}`));
      return;
    }

    saveRuntimeConfig(parsed);
    res.redirect('/?message=' + encodeURIComponent('Конфигурация сохранена'));
  });

  return app;
}

function renderFormPage(config, meta = {}) {
  const message = meta.message ? `<p class="notice">${escapeHtml(meta.message)}</p>` : '';
  const error = meta.error ? `<p class="error">${escapeHtml(meta.error)}</p>` : '';
  const serialized = escapeHtml(JSON.stringify(config, null, 2));
  const location = escapeHtml(CONFIG_PATH);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <title>timetable-generate admin</title>
    <style>
      :root { font-family: monospace; background: #f9f9f9; color: #111; }
      body { max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; }
      textarea { width: 100%; min-height: 480px; font-family: monospace; font-size: 0.9rem; padding: 0.75rem; border: 1px solid #999; background: #fff; }
      button { padding: 0.5rem 1rem; background: #111; color: #fff; border: none; cursor: pointer; }
      button:hover { background: #333; }
      .notice { color: #0a6; }
      .error { color: #a00; }
      .meta { font-size: 0.85rem; margin-bottom: 1rem; }
      form { margin-top: 1rem; }
      a { color: inherit; }
    </style>
  </head>
  <body>
    <h1>timetable-generate админ панель</h1>
    <div class="meta">Файл конфигурации: <code>${location}</code></div>
    ${message}
    ${error}
    <form method="post" action="/save">
      <label for="config">JSON конфигурация:</label>
      <textarea id="config" name="config" spellcheck="false">${serialized}</textarea>
      <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center;">
        <button type="submit">Сохранить</button>
        <a href="/config" target="_blank" rel="noopener noreferrer">Скачать JSON</a>
      </div>
    </form>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function startAdminServer({ port = 3000, host = '0.0.0.0' } = {}) {
  const app = createAdminApp();
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      process.stdout.write(`Admin panel running on http://${host}:${actualPort}\n`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  startAdminServer({ port, host }).catch((error) => {
    process.stderr.write(`Ошибка запуска админ панели: ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  createAdminApp,
  startAdminServer
};
