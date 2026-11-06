export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// localStorage can be missing or throw (private mode, blocked storage): everything degrades to defaults.
export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`cozy.${key}`);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`cozy.${key}`, JSON.stringify(value));
    } catch { /* ignore */ }
  },
};

export function emitter() {
  const subs = new Set();
  return {
    on(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    emit(...args) {
      subs.forEach((fn) => fn(...args));
    },
  };
}

// Accent-insensitive lowercase, one output char per input char (so match indexes map back).
export const fold = (s) => [...String(s)].map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] ?? c).join('');

// Small fzf-like scorer: every query word must match (substring or subsequence).
export function fuzzy(query, text) {
  const t = fold(text);
  let total = 0;
  for (const word of fold(query).split(/\s+/).filter(Boolean)) {
    const at = t.indexOf(word);
    if (at >= 0) {
      total += 100 + word.length * 10 - at * 0.5 + (at === 0 || /[\s\-_/'(]/.test(t[at - 1]) ? 40 : 0);
      continue;
    }
    if (word.length < 4) return -1;
    let score = 0;
    let from = 0;
    let streak = 0;
    let first = -1;
    for (const ch of word) {
      const found = t.indexOf(ch, from);
      if (found < 0) return -1;
      if (first < 0) first = found;
      streak = found === from ? streak + 1 : 0;
      score += 4 + streak * 3 + (found === 0 || /[\s\-_/]/.test(t[found - 1]) ? 6 : 0) - Math.min(found - from, 8) * 0.5;
      from = found + 1;
    }
    if (from - first > word.length * 3) return -1;
    total += score;
  }
  return total;
}

// Wraps query-word substrings in <b>, escaping the rest.
export function highlight(text, query) {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return esc(text);
  const folded = fold(text);
  const marks = new Array(text.length).fill(false);
  for (const w of words) {
    let i = folded.indexOf(w);
    while (i >= 0) {
      marks.fill(true, i, i + w.length);
      i = folded.indexOf(w, i + w.length);
    }
  }
  let out = '';
  let open = false;
  [...text].forEach((ch, i) => {
    if (marks[i] !== open) {
      out += marks[i] ? '<b>' : '</b>';
      open = marks[i];
    }
    out += esc(ch);
  });
  return open ? `${out}</b>` : out;
}

export const pad = (n) => String(n).padStart(2, '0');
export const fmtClock = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};
export const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
export function relTime(iso) {
  const days = Math.round((new Date(iso) - Date.now()) / 86400000);
  if (Math.abs(days) < 1) return "aujourd'hui";
  if (Math.abs(days) < 30) return rtf.format(days, 'day');
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}
export const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtSize = (b) => (b < 1024 ? `${b} o` : b < 1048576 ? `${Math.round(b / 1024)} Ko` : `${(b / 1048576).toFixed(1)} Mo`);

export function toast(message, { icon = '', timeout = 3800 } = {}) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span>${esc(message)}</span>`;
  host.append(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

export const go = (hash) => {
  if (location.hash !== hash) location.hash = hash;
};

export const isMobile = () => matchMedia('(max-width: 860px)').matches;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
