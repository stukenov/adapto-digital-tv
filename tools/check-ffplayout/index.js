const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const logsDir = process.argv[2] || process.env.LOGS_DIR;
const stateFilePath = process.env.STATE_FILE || '/data/sent.json';

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
  process.exit(1);
}

if (!logsDir) {
  console.error('Usage: node index.js <logs_dir>');
  process.exit(1);
}

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadState() {
  try {
    if (!fs.existsSync(stateFilePath)) {
      ensureDirExists(stateFilePath);
      fs.writeFileSync(stateFilePath, JSON.stringify({}), 'utf8');
    }
    const raw = fs.readFileSync(stateFilePath, 'utf8');
    const obj = JSON.parse(raw || '{}');
    return new Set(Object.keys(obj));
  } catch (err) {
    console.error('Failed to load state file, starting fresh:', err.message);
    return new Set();
  }
}

function saveState(sentSet) {
  try {
    const obj = {};
    for (const key of sentSet) obj[key] = Date.now();
    fs.writeFileSync(stateFilePath, JSON.stringify(obj), 'utf8');
  } catch (err) {
    console.error('Failed to save state:', err.message);
  }
}

function hashLine(filePath, line) {
  const h = crypto.createHash('sha256');
  h.update(filePath);
  h.update('|');
  h.update(line);
  return h.digest('hex');
}

function sendTelegramMessage(text) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          console.error('Telegram API error:', res.statusCode, body);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Telegram request failed:', err.message);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.write(payload);
    req.end();
  });
}

async function scanOnce(sentSet) {
  for (let n = 1; n <= 10; n++) {
    const filePath = path.join(logsDir, `ffplayout_${n}.log`);
    if (!fs.existsSync(filePath)) continue;

    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error('Failed to read file:', filePath, err.message);
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line) continue;
      if (line.indexOf('[ERROR]') === -1) continue;
      const key = hashLine(filePath, line);
      if (sentSet.has(key)) continue;

      const text = `[${path.basename(filePath)}] ${line}`;
      const ok = await sendTelegramMessage(text);
      if (ok) {
        sentSet.add(key);
        saveState(sentSet);
        // Small delay to avoid hitting rate limits if many errors
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
}

function startLoop() {
  const sentSet = loadState();
  console.log('check-ffplayout started. Watching:', logsDir);

  const loop = async () => {
    try {
      await scanOnce(sentSet);
    } catch (err) {
      console.error('Scan error:', err.message);
    } finally {
      setTimeout(loop, 60_000);
    }
  };

  loop();
}

startLoop();


