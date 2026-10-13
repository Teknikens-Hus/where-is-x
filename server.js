const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const NAME = process.env.X_OBJECT || 'x';
const HEADER_TEXT = process.env.HEADER_TEXT || '';
const LOCATIONS = (process.env.LOCATIONS || 'Not sure,Office,Home,ISS')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'days.json');
const PORT = Number(process.env.PORT) || 3000;
const LANG = ['en', 'sv'].includes(process.env.APP_LANG) ? process.env.APP_LANG : 'en';

let VERSION = '';
try {
  VERSION = require('fs').readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim();
} catch {}

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function load() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function save(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, DATA_FILE);
}

// Serialize writes so concurrent requests do not lose updates.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

const app = express();
app.use(express.json());

app.get('/api/config', (_req, res) => {
  res.json({ name: NAME, headerText: HEADER_TEXT, locations: LOCATIONS, lang: LANG, version: VERSION });
});

app.get('/api/days', async (req, res, next) => {
  try {
    const { month } = req.query;
    if (month !== undefined && !MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Invalid month' });
    }
    const data = await load();
    const out = {};
    for (const [date, loc] of Object.entries(data)) {
      if (!month || date.startsWith(`${month}-`)) out[date] = loc;
    }
    res.json(out);
  } catch (err) {
    next(err);
  }
});

app.put('/api/days/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const location = req.body ? req.body.location : null;
    if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Invalid date' });
    if (location != null && !LOCATIONS.includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }
    await enqueue(async () => {
      const data = await load();
      if (location == null) delete data[date];
      else data[date] = location;
      await save(data);
    });
    res.json({ date, location: location ?? null });
  } catch (err) {
    next(err);
  }
});

app.get('/edit', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
