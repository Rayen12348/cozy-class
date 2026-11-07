import { vault, matiereEmoji, cssColor } from './data.js';
import { THEMES, ACCENTS, applyTheme, current, themeEvents } from './themes.js';
import { mountPill, mountTimer } from './pomodoro.js';
import { mountMusicPill, mountRadio, mountMixer } from './music.js';
import { songs, mountSongs } from './songs.js';
import { icon } from './icons.js';
import { esc, store, clamp } from './util.js';

const FONTS = [
  { id: 'sans', label: 'Nunito', css: "'Nunito', ui-rounded, system-ui, sans-serif" },
  { id: 'serif', label: 'Literata', css: "'Literata', Georgia, serif" },
  { id: 'mono', label: 'Mono', css: "'JetBrains Mono', ui-monospace, monospace" },
];
const reading = { font: 'sans', size: 17, ...store.get('reading', {}) };

export function applyReading() {
  const root = document.documentElement.style;
  root.setProperty('--font-read', (FONTS.find((f) => f.id === reading.font) ?? FONTS[0]).css);
  root.setProperty('--reading-size', `${reading.size}px`);
  store.set('reading', reading);
}

let pop = null;
export function closePopover() {
  if (!pop) return;
  pop.cleanup?.();
  pop.el.remove();
  pop.anchor.classList.remove('open');
  pop = null;
}

function popover(anchor, build, cls = '') {
  const same = pop?.anchor === anchor;
  closePopover();
  if (same) return;
  const el = document.createElement('div');
  el.className = `pop ${cls}`;
  document.body.append(el);
  const cleanups = [];
  build(el, (fn) => fn && cleanups.push(fn));
  const r = anchor.getBoundingClientRect();
  el.style.top = `${r.bottom + 8}px`;
  el.style.left = `${clamp(r.right - el.offsetWidth, 8, window.innerWidth - el.offsetWidth - 8)}px`;
  anchor.classList.add('open');
  pop = { el, anchor, cleanup: () => cleanups.forEach((f) => f()) };
}

document.addEventListener('pointerdown', (e) => {
  if (pop && !pop.el.contains(e.target) && !pop.anchor.contains(e.target)) closePopover();
});

function pomoPanel(el, keep) {
  el.innerHTML = `<div class="pop-title">${icon('timer')} pomodoro</div><div class="timer-host"></div>
    <a class="btn sm ghost wide" href="#/etude">${icon('coffee')} ouvrir la salle d'étude</a>`;
  keep(mountTimer(el.querySelector('.timer-host'), { compact: true }));
  el.querySelector('a').addEventListener('click', closePopover);
}

function musicPanel(el, keep) {
  el.innerHTML = `<div class="pop-title">${icon('radio')} radio</div><div class="radio"></div>
    <div class="pop-title">${icon('waves')} ambiance</div><div class="mixer"></div>`;
  keep(mountRadio(el.querySelector('.radio')));
  keep(mountMixer(el.querySelector('.mixer')));
}

function songsPanel(el, keep) {
  el.innerHTML = `<div class="pop-title">${icon('headphones')} chansons <span class="pop-sub">YouTube Music</span></div><div class="songs-host"></div>`;
  keep(mountSongs(el.querySelector('.songs-host'), { autofocus: true }));
}

function mountSongsButton(el) {
  const update = () => {
    const on = songs.active && songs.playing;
    el.classList.toggle('playing', on);
    el.innerHTML = on ? '<span class="eq"><i></i><i></i><i></i><i></i></span>' : icon('headphones');
  };
  update();
  songs.events.on(update);
}

function themePanel(el, keep) {
  const render = () => {
    el.innerHTML = `
      <div class="pop-title">${icon('palette')} thème</div>
      <div class="theme-list">${Object.entries(THEMES).map(([id, t]) => `
        <button class="theme-opt ${id === current.theme ? 'on' : ''}" data-theme="${id}" style="--bg:${t.c.base};--fg:${t.c.text};--bd:${t.c.surface1}">
          <span class="theme-sw">${['red', 'peach', 'yellow', 'green', 'blue', 'mauve'].map((c) => `<i style="background:${t.c[c]}"></i>`).join('')}</span>
          <span>${esc(t.label)}</span>
        </button>`).join('')}</div>
      <div class="pop-title">accent</div>
      <div class="accent-list">${ACCENTS.map((c) => `<button class="accent-opt ${c === current.accent ? 'on' : ''}" data-accent="${c}" style="--c:var(--${c})" title="${c}"></button>`).join('')}</div>
      <div class="pop-title">${icon('book')} lecture</div>
      <div class="chips seg">${FONTS.map((f) => `<button class="chip ${f.id === reading.font ? 'on' : ''}" data-font="${f.id}" style="font-family:${f.css}">${f.label}</button>`).join('')}</div>
      <label class="vol-row">${icon('type')}<input type="range" min="14" max="22" step="1" value="${reading.size}" data-size><span class="muted small">${reading.size}px</span></label>`;
  };
  render();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.theme) applyTheme(b.dataset.theme, current.accent);
    if (b.dataset.accent) applyTheme(current.theme, b.dataset.accent);
    if (b.dataset.font) {
      reading.font = b.dataset.font;
      applyReading();
      render();
    }
  });
  el.addEventListener('input', (e) => {
    if (e.target.dataset.size == null) return;
    reading.size = Number(e.target.value);
    applyReading();
    e.target.nextElementSibling.textContent = `${reading.size}px`;
  });
  keep(themeEvents.on(render));
}

export function mountBar(el, { onMenu, onSearch }) {
  el.innerHTML = `
    <div class="bar-group">
      <button class="mod icon-mod show-sm" data-menu title="Menu">${icon('menu')}</button>
      <a class="mod mod-logo" href="#/">${icon('terminal')}<span>${esc(vault.site.title)}</span></a>
      <nav class="mod ws-list hide-sm" aria-label="Matières">${vault.matieres.map((m) => `
        <a class="ws" href="#/m/${m.id}" data-m="${m.id}" style="--c:${cssColor(m.color)}" title="${esc(m.name)}${m.index < 9 ? ` (alt ${m.index + 1})` : ''}">
          <span class="ws-icon">${matiereEmoji(m)}</span><span class="ws-name">${esc(m.name)}</span>
        </a>`).join('')}</nav>
    </div>
    <div class="bar-group bar-center hide-md"><div class="mod mod-clock"></div></div>
    <div class="bar-group bar-right">
      <button class="mod" data-search title="Rechercher (Ctrl K)">${icon('search')}<span class="hide-sm">lancer</span><kbd class="hide-sm">ctrl k</kbd></button>
      <button class="mod pomo-pill" data-pop="pomo"></button>
      ${songs.enabled() ? '<button class="mod icon-mod songs-btn" data-pop="songs" title="Chansons : cherche et joue ce que tu veux (c)"></button>' : ''}
      <button class="mod music-pill" data-pop="music" title="Musique & ambiance"></button>
      <button class="mod icon-mod" data-pop="theme" title="Thème">${icon('palette')}</button>
    </div>`;

  mountPill(el.querySelector('.pomo-pill'));
  mountMusicPill(el.querySelector('.music-pill'));
  if (songs.enabled()) mountSongsButton(el.querySelector('.songs-btn'));

  const clock = el.querySelector('.mod-clock');
  const tick = () => {
    const d = new Date();
    clock.innerHTML = `${icon('clock')}<span>${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span><b>${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</b>`;
  };
  tick();
  setInterval(tick, 10000);

  const panels = { pomo: [pomoPanel, 'pop-pomo'], music: [musicPanel, 'pop-music'], songs: [songsPanel, 'pop-songs'], theme: [themePanel, 'pop-theme'] };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pop) popover(b, ...panels[b.dataset.pop]);
    else if (b.hasAttribute('data-menu')) onMenu();
    else if (b.hasAttribute('data-search')) onSearch();
  });
}

// Opens the "chansons" popover (from the launcher, the dock or the c key).
export function openSongs() {
  const b = document.querySelector('#bar .songs-btn');
  if (b && !b.classList.contains('open')) b.click();
}

export function setWorkspace(id) {
  document.querySelectorAll('.ws').forEach((w) => w.classList.toggle('active', w.dataset.m === id));
}
