import { store, emitter, fmtClock, today, toast, esc } from './util.js';
import { icon } from './icons.js';
import { chime, unlockAudio } from './audio.js';

export const MODES = [
  { id: 'focus', label: 'Focus', color: 'red', icon: 'timer', done: 'Session terminée ! Prends une pause.' },
  { id: 'short', label: 'Pause courte', color: 'green', icon: 'coffee', done: 'Pause finie, on y retourne.' },
  { id: 'long', label: 'Pause longue', color: 'blue', icon: 'clock', done: 'Grande pause terminée, bien joué.' },
];
export const modeOf = (id) => MODES.find((m) => m.id === id) ?? MODES[0];

export const stats = {
  all: () => store.get('pomo.stats', {}),
  day(d = today()) {
    return this.all()[d] ?? { count: 0, minutes: 0, by: {} };
  },
  forMatiere(id) {
    return Object.values(this.all()).reduce((n, d) => n + (d.by?.[id] ?? 0), 0);
  },
  record(minutes, matiere) {
    const all = this.all();
    const d = (all[today()] ??= { count: 0, minutes: 0, by: {} });
    d.count += 1;
    d.minutes += minutes;
    if (matiere) d.by[matiere] = (d.by[matiere] ?? 0) + 1;
    store.set('pomo.stats', all);
  },
};

class Pomodoro {
  events = emitter();
  context = () => null; // current matière, set by the router
  baseTitle = document.title;

  init(defaults = {}) {
    this.settings = { focus: 25, short: 5, long: 15, longEvery: 4, autoStart: false, sound: true, notify: true, ...defaults, ...store.get('pomo.settings', {}) };
    const s = store.get('pomo.state', {});
    this.mode = modeOf(s.mode).id;
    this.endAt = s.endAt ?? null;
    this.remaining = s.remaining ?? this.duration();
    this.round = s.round ?? 0;
    this.events.on(() => this.updateTitle());
    setInterval(() => this.tick(), 500);
    this.tick();
  }

  duration(mode = this.mode) {
    return this.settings[mode] * 60000;
  }
  get running() {
    return this.endAt != null;
  }
  get left() {
    return this.running ? Math.max(0, this.endAt - Date.now()) : this.remaining;
  }
  get progress() {
    return 1 - this.left / this.duration();
  }

  changed() {
    store.set('pomo.state', { mode: this.mode, endAt: this.endAt, remaining: this.remaining, round: this.round });
    this.events.emit();
  }
  start() {
    if (this.running) return;
    unlockAudio();
    if (this.settings.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    this.endAt = Date.now() + this.remaining;
    this.changed();
  }
  pause() {
    if (!this.running) return;
    this.remaining = this.left;
    this.endAt = null;
    this.changed();
  }
  toggle() {
    if (this.running) this.pause();
    else this.start();
  }
  reset() {
    this.endAt = null;
    this.remaining = this.duration();
    this.changed();
  }
  setMode(mode) {
    this.mode = mode;
    this.reset();
  }
  skip() {
    this.finish(false);
  }
  tick() {
    if (!this.running) return;
    if (this.left <= 0) this.finish(true);
    else this.events.emit();
  }
  finish(completed) {
    const was = modeOf(this.mode);
    if (was.id === 'focus' && completed) {
      this.round += 1;
      stats.record(this.settings.focus, this.context());
    }
    this.mode = was.id !== 'focus' ? 'focus' : this.round > 0 && this.round % this.settings.longEvery === 0 ? 'long' : 'short';
    this.remaining = this.duration();
    this.endAt = completed && this.settings.autoStart ? Date.now() + this.remaining : null;
    if (completed) {
      if (this.settings.sound) chime(was.id === 'focus');
      toast(was.done, { icon: icon(was.icon), timeout: 6000 });
      if (this.settings.notify && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${was.label} terminé`, { body: was.done, silent: true });
      }
    }
    this.changed();
  }
  update(patch) {
    Object.assign(this.settings, patch);
    store.set('pomo.settings', this.settings);
    if (!this.running) this.remaining = this.duration();
    this.changed();
  }
  setTitle(title) {
    this.baseTitle = title;
    this.updateTitle();
  }
  updateTitle() {
    document.title = this.running ? `${fmtClock(this.left)} · ${this.baseTitle}` : this.baseTitle;
  }
}

export const pomodoro = new Pomodoro();

// ── Widgets ──────────────────────────────────────────────────────────

export function mountPill(el) {
  const update = () => {
    const m = modeOf(pomodoro.mode);
    el.classList.toggle('running', pomodoro.running);
    el.style.setProperty('--c', `var(--${m.color})`);
    el.innerHTML = `${icon('timer')}<span class="pomo-time">${fmtClock(pomodoro.left)}</span><span class="pomo-mode hide-sm">${m.label.toLowerCase()}</span>`;
    el.title = `${m.label} — ${pomodoro.running ? 'en cours' : 'en pause'}`;
  };
  update();
  return pomodoro.events.on(update);
}

export function mountTimer(el, { compact = false } = {}) {
  el.classList.add('timer', compact ? 'compact' : 'big');
  el.innerHTML = `
    <div class="chips seg pomo-modes">${MODES.map((m) => `<button class="chip" data-mode="${m.id}" style="--c:var(--${m.color})">${m.label}</button>`).join('')}</div>
    <div class="ring">
      <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="54"/><circle class="ring-fg" cx="60" cy="60" r="54" pathLength="100"/></svg>
      <div class="ring-center"><div class="ring-time"></div><div class="ring-sub"></div></div>
    </div>
    <div class="pomo-actions">
      <button class="icon-btn lg" data-act="reset" title="Réinitialiser">${icon('reset')}</button>
      <button class="btn primary pomo-toggle" data-act="toggle"></button>
      <button class="icon-btn lg" data-act="skip" title="Passer à la suite">${icon('skip')}</button>
    </div>
    <div class="rounds" title="Sessions avant la pause longue"></div>`;
  const $ = (s) => el.querySelector(s);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mode) pomodoro.setMode(b.dataset.mode);
    if (b.dataset.act) pomodoro[b.dataset.act]();
  });
  const update = () => {
    const m = modeOf(pomodoro.mode);
    el.style.setProperty('--c', `var(--${m.color})`);
    el.classList.toggle('running', pomodoro.running);
    el.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m.id));
    $('.ring-fg').style.strokeDashoffset = String(100 - pomodoro.progress * 100);
    $('.ring-fg').style.opacity = pomodoro.progress > 0.002 ? 1 : 0;
    $('.ring-time').textContent = fmtClock(pomodoro.left);
    $('.ring-sub').textContent = m.label;
    $('.pomo-toggle').innerHTML = pomodoro.running ? `${icon('pause')} Pause` : `${icon('play')} ${pomodoro.progress > 0.001 ? 'Reprendre' : 'Démarrer'}`;
    const every = pomodoro.settings.longEvery;
    const filled = pomodoro.round % every || (pomodoro.round && pomodoro.mode === 'long' ? every : 0);
    $('.rounds').innerHTML = Array.from({ length: every }, (_, i) => `<span class="${i < filled ? 'on' : ''}"></span>`).join('') + `<small>${pomodoro.round} pomodoro${pomodoro.round > 1 ? 's' : ''} au total</small>`;
  };
  update();
  return pomodoro.events.on(update);
}

export function mountSettings(el) {
  const s = pomodoro.settings;
  const num = (key, label, max) => `<label class="num-field"><span>${label}</span><input type="number" min="1" max="${max}" value="${s[key]}" data-key="${key}"></label>`;
  const check = (key, label) => `<label class="switch"><input type="checkbox" data-key="${key}" ${s[key] ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  el.innerHTML = `
    <div class="num-grid">${num('focus', 'focus (min)', 180)}${num('short', 'pause (min)', 60)}${num('long', 'longue (min)', 90)}${num('longEvery', 'longue tous les', 12)}</div>
    <div class="switches">${check('autoStart', 'Enchaîner automatiquement')}${check('sound', 'Son à la fin')}${check('notify', 'Notification du navigateur')}</div>`;
  el.addEventListener('change', (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    const value = e.target.type === 'checkbox' ? e.target.checked : Math.max(1, Number(e.target.value) || 1);
    pomodoro.update({ [key]: value });
  });
}
