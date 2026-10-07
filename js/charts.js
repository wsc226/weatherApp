// Linked forecast charts: three panels on one shared time axis (temperature + dew point,
// pressure, precipitation). Each panel has its own y-scale, so there is never a dual axis.
// A cursor follows the timeline; hovering shows one tooltip for every measure at that hour,
// and clicking (or arrow keys) moves the timeline.
import { conv, fmt, wallTime } from './units.js';

const SVG = 'http://www.w3.org/2000/svg';

// "Nice" axis ticks (1, 2, 2.5, 5 x 10^n) covering [lo, hi].
export function niceTicks(lo, hi, count = 4) {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const start = Math.floor(lo / step) * step, end = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

// Domain around the data, never narrower than minSpan, so tiny wiggles do not look dramatic.
export function domain(values, minSpan, floorZero = false) {
  let lo = Math.min(...values), hi = Math.max(...values);
  if (floorZero) { lo = 0; hi = Math.max(hi, minSpan); }
  else if (hi - lo < minSpan) { const mid = (lo + hi) / 2; lo = mid - minSpan / 2; hi = mid + minSpan / 2; }
  const ticks = niceTicks(lo, hi, 4);
  return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks };
}

// Plain-language summary of the forecast, shown above the charts and read by screen readers.
export function summarize(h, units) {
  const c = conv(units), f = fmt(units);
  const t = h.temperature_2m, d = h.dew_point_2m, p = h.pressure_msl;
  const total = h.precipitation.reduce((a, b) => a + (b || 0), 0);
  const minGap = Math.min(...t.map((v, i) => v - d[i]));
  const first = p[0], last = p[p.length - 1], low = Math.min(...p), lowAt = p.indexOf(low);
  const dp = last - first, r = v => Math.round(v);
  // A dip (fall, then recovery) is the classic sign of a passing low or front; say so plainly.
  const trend = first - low >= 3 && last - low >= 3
    ? `falls from ${r(first)} hPa to a low of ${r(low)} hPa around ${wallTime(h.time[lowAt])}, then rises to ${r(last)} hPa`
    : Math.abs(dp) < 2 ? 'stays about the same' : dp < 0 ? `falls by ${r(-dp)} hPa` : `rises by ${r(dp)} hPa`;
  const parts = [
    `Temperature ranges from ${f.temp(Math.min(...t))} to ${f.temp(Math.max(...t))}.`,
    minGap <= 1.5
      ? 'At some hours the dew point nearly reaches the temperature, so the air is close to saturated.'
      : `The dew point stays at least ${Math.round(c.temp(minGap) - c.temp(0))} ${c.tempUnit} below the temperature.`,
    `Pressure ${trend}.`,
    total > 0 ? `Total precipitation: ${f.precip(total)}.` : 'No precipitation is forecast.',
  ];
  return parts.join(' ');
}

const PANELS = [
  { key: 'temp', h: 150, title: u => `Temperature and dew point (${conv(u).tempUnit})`, hint: 'When the lines meet, the air is saturated: expect dew, fog, or cloud.' },
  { key: 'pres', h: 100, title: () => 'Air pressure at sea level (hPa)', hint: 'Falling pressure often comes before clouds and rain.' },
  { key: 'prec', h: 80, title: u => `Precipitation (${conv(u).precipUnit} per hour)`, hint: '' },
];
const M = { left: 46, right: 60, title: 48, gap: 16, axis: 26 };

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.append(n);
  return n;
}
function text(parent, x, y, str, cls, anchor = 'start') {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}

export class ForecastCharts {
  constructor(root, { onSelect }) {
    this.root = root;
    this.onSelect = onSelect;
    this.index = 0;
    this.units = 'metric';
    this.h = null;
    root.replaceChildren();

    this.summaryEl = Object.assign(document.createElement('p'), { className: 'chart-summary', id: 'chart-summary' });
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    for (const [cls, label] of [['temp', 'Air temperature'], ['dew', 'Dew point']]) {
      const item = document.createElement('span'), key = document.createElement('span');
      key.className = `key key-${cls}`;
      item.append(key, document.createTextNode(label));
      legend.append(item);
    }
    this.frame = document.createElement('div');
    this.frame.className = 'chart-frame';
    this.svg = el('svg', {
      class: 'chart-svg', tabindex: '0', role: 'group', 'aria-describedby': 'chart-summary',
      'aria-label': 'Forecast charts. Use the left and right arrow keys to move through the hours.',
    });
    this.tip = document.createElement('div');
    this.tip.className = 'chart-tip';
    this.tip.hidden = true;
    this.frame.append(this.svg, this.tip);

    const details = document.createElement('details');
    details.className = 'chart-table';
    const sum = document.createElement('summary');
    sum.textContent = 'Show the numbers as a table';
    this.tableWrap = document.createElement('div');
    this.tableWrap.className = 'table-scroll';
    details.append(sum, this.tableWrap);
    details.addEventListener('toggle', () => { if (details.open) this.renderTable(); });
    this.details = details;

    root.append(this.summaryEl, legend, this.frame, details);

    this.svg.addEventListener('pointermove', e => this.hoverAt(e));
    this.svg.addEventListener('pointerleave', () => this.hideHover());
    this.svg.addEventListener('click', e => { const i = this.indexAt(e); if (i != null) this.onSelect(i); });
    this.svg.addEventListener('focus', () => this.showTip(this.index));
    this.svg.addEventListener('blur', () => this.hideHover());
    this.svg.addEventListener('keydown', e => {
      const n = this.h?.time.length ?? 0;
      const to = { ArrowLeft: this.index - 1, ArrowRight: this.index + 1, Home: 0, End: n - 1 }[e.key];
      if (to == null || !n) return;
      e.preventDefault();
      this.onSelect(Math.max(0, Math.min(n - 1, to)));
    });
    new ResizeObserver(() => this.draw()).observe(this.frame);
  }

  setData(hourly, units, tz = '') { this.h = hourly; this.units = units; this.tz = tz; this.draw(); if (this.details.open) this.renderTable(); }
  setUnits(units) { this.units = units; this.draw(); if (this.details.open) this.renderTable(); }
  setIndex(i) {
    this.index = i;
    this.placeCursor();
    if (document.activeElement === this.svg) this.showTip(i);
  }

  x(i) { return M.left + (i * this.plotW) / Math.max(1, this.h.time.length - 1); }

  indexAt(e) {
    if (!this.h) return null;
    const r = this.svg.getBoundingClientRect(), px = e.clientX - r.left;
    if (px < M.left - 8 || px > this.width - M.right + 8) return null;
    const n = this.h.time.length;
    return Math.max(0, Math.min(n - 1, Math.round(((px - M.left) / this.plotW) * (n - 1))));
  }

  draw() {
    if (!this.h) return;
    const width = this.frame.clientWidth;
    if (!width) return;
    this.width = width;
    this.plotW = width - M.left - M.right;
    const c = conv(this.units), h = this.h, n = h.time.length;
    const temp = h.temperature_2m.map(c.temp), dew = h.dew_point_2m.map(c.temp);
    const pres = h.pressure_msl, prec = h.precipitation.map(v => c.precip(v || 0));
    const imp = this.units === 'imperial';
    const scales = {
      temp: domain([...temp, ...dew], imp ? 18 : 10),
      pres: domain(pres, 12),
      prec: domain(prec, imp ? 0.08 : 2, true),
    };
    this.series = { temp, dew, pres, prec };

    let y0 = 0;
    this.panels = PANELS.map(p => { const top = y0 + M.title; y0 = top + p.h + M.gap; return { ...p, top }; });
    const height = y0 - M.gap + M.axis;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.replaceChildren();

    const grid = el('g', { class: 'c-grid' }, this.svg);
    const marks = el('g', {}, this.svg);
    // Day boundaries run through every panel so the three charts read as one timeline.
    const dayIdx = h.time.map((t, i) => (t.endsWith('T00:00') ? i : -1)).filter(i => i >= 0);
    const firstTop = this.panels[0].top, lastBottom = this.panels.at(-1).top + this.panels.at(-1).h;

    for (const p of this.panels) {
      const s = scales[p.key], y = v => p.top + p.h - ((v - s.lo) / (s.hi - s.lo)) * p.h;
      p.y = y;
      text(this.svg, M.left, p.top - 30, p.title(this.units), 'c-title');
      if (p.hint) text(this.svg, M.left, p.top - 14, p.hint, 'c-hint');
      for (const t of s.ticks) {
        el('line', { x1: M.left, x2: width - M.right, y1: y(t), y2: y(t) }, grid);
        text(this.svg, M.left - 6, y(t) + 4, p.key === 'prec' && imp ? t.toFixed(2) : String(Math.round(t * 10) / 10), 'c-tick', 'end');
      }
      if (p.key === 'temp') {
        for (const [k, vals] of [['dew', dew], ['temp', temp]]) {
          el('path', { d: vals.map((v, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)},${y(v).toFixed(1)}`).join(''), class: `c-line c-${k}` }, marks);
        }
        // Direct end labels supplement the legend, but only when they will not collide.
        const ey = [y(temp[n - 1]), y(dew[n - 1])];
        if (Math.abs(ey[0] - ey[1]) >= 14) {
          text(this.svg, width - M.right + 6, ey[0] + 4, 'Air', 'c-end');
          text(this.svg, width - M.right + 6, ey[1] + 4, 'Dew pt', 'c-end');
        }
      } else if (p.key === 'pres') {
        el('path', { d: pres.map((v, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)},${y(v).toFixed(1)}`).join(''), class: 'c-line c-pres' }, marks);
      } else {
        const slot = this.plotW / n, w = Math.max(1, Math.min(24, slot - 2)), r = Math.min(4, w / 2);
        prec.forEach((v, i) => {
          if (v <= 0) return;
          const x0 = this.x(i) - w / 2, top = y(v), base = p.top + p.h, hgt = base - top;
          const rr = Math.min(r, hgt);
          // Rounded data end (top), square at the baseline.
          el('path', { class: 'c-bar', d: `M${x0},${base}V${top + rr}Q${x0},${top} ${x0 + rr},${top}H${x0 + w - rr}Q${x0 + w},${top} ${x0 + w},${top + rr}V${base}Z` }, marks);
        });
      }
    }

    for (const i of dayIdx) el('line', { x1: this.x(i), x2: this.x(i), y1: firstTop, y2: lastBottom, class: 'c-day' }, grid);
    // Time axis under the last panel: weekday at midnight, "noon" ticks in between.
    h.time.forEach((t, i) => {
      if (t.endsWith('T00:00')) text(this.svg, this.x(i), lastBottom + 18, wallTime(t, { weekday: 'short' }), 'c-tick c-day-label', 'middle');
      else if (t.endsWith('T12:00')) text(this.svg, this.x(i), lastBottom + 18, 'noon', 'c-tick', 'middle');
    });

    // Cursor (the timeline's hour) and hover crosshair, drawn above the marks.
    this.cursor = el('g', { class: 'c-cursor' }, this.svg);
    el('line', { y1: firstTop, y2: lastBottom }, this.cursor);
    this.cursorDots = ['temp', 'dew', 'pres'].map(k => el('circle', { r: 4, class: `c-dot c-${k}` }, this.cursor));
    this.cross = el('line', { class: 'c-cross', y1: firstTop, y2: lastBottom, visibility: 'hidden' }, this.svg);
    this.placeCursor();
    this.summaryEl.textContent = summarize(h, this.units);
  }

  placeCursor() {
    if (!this.cursor || !this.h) return;
    const i = Math.min(this.index, this.h.time.length - 1), x = this.x(i);
    const line = this.cursor.querySelector('line');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    const [pt, pp] = [this.panels[0], this.panels[1]];
    const ys = [pt.y(this.series.temp[i]), pt.y(this.series.dew[i]), pp.y(this.series.pres[i])];
    this.cursorDots.forEach((d, k) => { d.setAttribute('cx', x); d.setAttribute('cy', ys[k]); });
  }

  hoverAt(e) {
    const i = this.indexAt(e);
    if (i == null) { this.hideHover(); return; }
    this.cross.setAttribute('x1', this.x(i)); this.cross.setAttribute('x2', this.x(i));
    this.cross.setAttribute('visibility', 'visible');
    this.showTip(i);
  }

  hideHover() {
    this.cross?.setAttribute('visibility', 'hidden');
    this.tip.hidden = true;
  }

  // One tooltip lists every measure at that hour; values lead, names follow.
  showTip(i) {
    if (!this.h || !this.panels) return;
    const f = fmt(this.units), h = this.h, tz = this.tz ? ` ${this.tz}` : '';
    const rows = [
      ['temp', f.temp(h.temperature_2m[i]), 'Air temperature'],
      ['dew', f.temp(h.dew_point_2m[i]), 'Dew point'],
      ['pres', f.pressure(h.pressure_msl[i]), 'Pressure'],
      ['prec', `${f.precip(h.precipitation[i] || 0)}/h`, 'Precipitation'],
    ];
    const head = document.createElement('p');
    head.className = 'tip-time';
    head.textContent = wallTime(h.time[i]) + tz;
    const list = rows.map(([k, v, name]) => {
      const row = document.createElement('p'), key = document.createElement('span'), val = document.createElement('strong'), lab = document.createElement('span');
      key.className = `key key-${k}`; val.textContent = v; lab.textContent = name;
      row.append(key, val, lab);
      return row;
    });
    this.tip.replaceChildren(head, ...list);
    this.tip.hidden = false;
    const x = this.x(i), tw = this.tip.offsetWidth;
    this.tip.style.left = `${x + 12 + tw > this.width ? x - tw - 12 : x + 12}px`;
    this.tip.style.top = `${this.panels[0].top}px`;
  }

  renderTable() {
    if (!this.h) return;
    const f = fmt(this.units), h = this.h;
    const table = document.createElement('table'), thead = document.createElement('thead'), tbody = document.createElement('tbody');
    const hr = document.createElement('tr');
    for (const label of ['Time (local)', 'Air temperature', 'Dew point', 'Pressure', 'Precipitation per hour']) {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; hr.append(th);
    }
    thead.append(hr);
    h.time.forEach((t, i) => {
      const tr = document.createElement('tr');
      const cells = [wallTime(t), f.temp(h.temperature_2m[i]), f.temp(h.dew_point_2m[i]), f.pressure(h.pressure_msl[i]), f.precip(h.precipitation[i] || 0)];
      cells.forEach((v, k) => { const td = document.createElement(k ? 'td' : 'th'); if (!k) td.scope = 'row'; td.textContent = v; tr.append(td); });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    this.tableWrap.replaceChildren(table);
  }
}
