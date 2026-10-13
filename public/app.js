const EDIT = document.body.dataset.mode === 'edit';
const state = { config: null, days: {}, year: 0, month: 0, selected: null };

const I18N = {
  en: {
    locale: 'en-GB',
    heading: (n) => `Where is ${n}?`,
    title: (n) => `Where is ${n}`,
    exitEditMode: 'Exit edit mode',
    today: 'Today',
    tomorrow: 'Tomorrow',
    prev: 'Previous month',
    next: 'Next month',
    theme: 'Toggle theme',
    isIn: (n, loc) => `${n} is in `,
    unknown: (n) => `${n} is unknown`,
  },
  sv: {
    locale: 'sv-SE',
    heading: (n) => `Var är ${n}?`,
    title: (n) => `Var är ${n}`,
    exitEditMode: 'Avsluta redigering',
    today: 'Idag',
    tomorrow: 'Imorgon',
    prev: 'Föregående månad',
    next: 'Nästa månad',
    theme: 'Växla tema',
    isIn: (n) => `${n} är i `,
    unknown: (n) => `${n} är okänd`,
  },
};
let T = I18N.en;

function applyStaticText() {
  document.documentElement.lang = state.config.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = T[el.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', T[el.dataset.i18nAria]);
  });
}

const pad = (n) => String(n).padStart(2, '0');
const monthDate = (offset = 0) => new Date(state.year, state.month + offset, 1);
const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const colorOf = (loc) => `var(--c${state.config.locations.indexOf(loc) % 6})`;

async function api(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function loadDays() {
  const months = await Promise.all([0, 1].map((offset) =>
    api(`/api/days?month=${monthKey(monthDate(offset))}`)
  ));
  state.days = Object.assign({}, ...months);
}

function render() {
  const container = document.getElementById('months');
  container.innerHTML = '';
  const now = new Date();
  const first = monthDate();
  const title = document.getElementById('title');
  title.textContent = first.toLocaleDateString(T.locale, { month: 'long', year: 'numeric' });

  const grid = document.createElement('div');
  grid.className = 'grid';
  for (let i = 0; i < 7; i++) {
    const el = document.createElement('div');
    el.className = 'dow';
    el.textContent = new Date(2024, 0, 1 + i).toLocaleDateString(T.locale, { weekday: 'short' });
    grid.appendChild(el);
  }

  const firstOffset = (first.getDay() + 6) % 7;
  for (let i = 0; i < firstOffset; i++) {
    const el = document.createElement('div');
    el.className = 'day empty';
    grid.appendChild(el);
  }

  for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
    const first = monthDate(monthOffset);
    const year = first.getFullYear();
    const month = first.getMonth();

    const total = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= total; d++) {
      const date = `${year}-${pad(month + 1)}-${pad(d)}`;
      const el = document.createElement('div');
      el.className = 'day';
      if (monthOffset > 0) el.classList.add('next-month');
      if (now.getFullYear() === year && now.getMonth() === month && now.getDate() === d) {
        el.classList.add('today');
      }
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = d;
      el.appendChild(num);
      const monthMark = document.createElement('span');
      monthMark.className = 'month-mark';
      if (d === 1 && monthOffset > 0) {
        monthMark.textContent = first.toLocaleDateString(T.locale, { month: 'short' });
      }
      el.appendChild(monthMark);

      const loc = state.days[date];
      if (loc) {
        num.classList.add('dot');
        num.style.background = colorOf(loc);
        num.title = loc;
      }
      if (EDIT) {
        el.classList.add('editable');
        el.addEventListener('click', () => setDay(date, state.selected));
      }
      grid.appendChild(el);
    }
  }
  container.appendChild(grid);
}

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  const entries = state.config.locations;

  entries.forEach((loc) => {
    const item = document.createElement(EDIT ? 'button' : 'span');
    item.className = 'legend-item';
    if (EDIT && state.selected === loc) {
      item.classList.add('selected');
      item.style.borderColor = colorOf(loc);
    }
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = colorOf(loc);
    item.append(swatch, loc);
    if (EDIT) {
      item.addEventListener('click', () => {
        state.selected = loc;
        renderLegend();
      });
    }
    legend.appendChild(item);
  });
}

async function setDay(date, selected) {
  const previous = state.days[date];
  const location = previous === selected ? null : selected;
  if (location) state.days[date] = location;
  else delete state.days[date];
  render();
  try {
    await api(`/api/days/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
    });
  } catch {
    if (previous) state.days[date] = previous;
    else delete state.days[date];
    render();
  }
  renderSummary();
}

async function renderSummary() {
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const dates = [fmt(today), fmt(tomorrow)];
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
  const days = Object.assign({}, ...(await Promise.all(months.map((m) => api(`/api/days?month=${m}`)))));

  const box = document.getElementById('summary');
  box.innerHTML = '';
  [[T.today, dates[0]], [T.tomorrow, dates[1]]].forEach(([when, date]) => {
    const loc = days[date];
    const h = document.createElement('h3');
    h.textContent = when;
    const p = document.createElement('p');
    if (loc) {
      p.append(T.isIn(state.config.name));
      const strong = document.createElement('strong');
      strong.textContent = loc;
      strong.style.color = colorOf(loc);
      p.append(strong);
    } else {
      p.append(T.unknown(state.config.name));
    }
    box.append(h, p);
  });
}

async function shift(delta) {
  const d = new Date(state.year, state.month + delta, 1);
  state.year = d.getFullYear();
  state.month = d.getMonth();
  await loadDays();
  render();
}

async function init() {
  state.config = await api('/api/config');
  T = I18N[state.config.lang] || I18N.en;
  applyStaticText();
  document.getElementById('version').textContent = state.config.version ? `v${state.config.version}` : '';
  document.title = T.title(state.config.name);
  document.getElementById('heading').textContent = state.config.headerText || T.heading(state.config.name);
  const now = new Date();
  state.year = now.getFullYear();
  state.month = now.getMonth();
  document.getElementById('prev').addEventListener('click', () => shift(-1));
  document.getElementById('next').addEventListener('click', () => shift(1));
  document.getElementById('today').addEventListener('click', async () => {
    const t = new Date();
    state.year = t.getFullYear();
    state.month = t.getMonth();
    await loadDays();
    render();
  });
  state.selected = state.config.locations[0] ?? null;
  renderLegend();
  await loadDays();
  render();
  renderSummary();
}

init();
