import { loadVault, vault, items, matieres, canvases } from './data.js';
import { initTheme } from './themes.js';
import { pomodoro } from './pomodoro.js';
import { radio, mountDock } from './music.js';
import { mountBar, setWorkspace, applyReading, closePopover, openSongs } from './bar.js';
import { songs } from './songs.js';
import { mountSidebar, setActive } from './sidebar.js';
import { initLauncher, openLauncher, toggleLauncher, launcherOpen } from './launcher.js';
import { renderHome } from './views/home.js';
import { renderMatiere } from './views/matiere.js';
import { renderNote } from './views/note.js';
import { renderGraph } from './views/graph.js';
import { renderCanvasPage } from './views/canvas.js';
import { renderStudy } from './views/study.js';
import { notFound } from './views/notfound.js';
import { $, esc, go, store, isMobile } from './util.js';

const view = $('#view');
const sidebar = $('#sidebar');

const ROUTES = [
  [/^\/$/, renderHome, () => null],
  [/^\/m\/([^/]+)$/, renderMatiere, ([id]) => matieres.get(id)?.name],
  [/^\/n\/(.+)$/, renderNote, ([id]) => items.get(id)?.title],
  [/^\/c\/(.+)$/, renderCanvasPage, ([id]) => canvases.get(`c/${id}`)?.title],
  [/^\/graph$/, renderGraph, () => 'Graphe'],
  [/^\/etude$/, renderStudy, () => "Salle d'étude"],
];

let cleanup = null;
let currentPath = null;
let token = 0;

async function route() {
  const [path, qs = ''] = (location.hash.replace(/^#/, '') || '/').split('?');
  const query = new URLSearchParams(qs);
  closePopover();
  if (isMobile()) document.body.classList.remove('side-open');

  // Same note, different heading: just scroll.
  if (path === currentPath && view.scrollToHeading) {
    view.scrollToHeading(query.get('h'));
    return;
  }
  if (path === currentPath && !path.startsWith('/m/')) return;

  cleanup?.();
  cleanup = null;
  currentPath = path;
  const mine = ++token;
  delete view.scrollToHeading;
  view.className = 'view';
  view.scrollTop = 0;

  const match = ROUTES.map(([re, render, title]) => [re.exec(path), render, title]).find(([m]) => m);
  const params = match ? match[0].slice(1).map(decodeURIComponent) : [];
  const title = match?.[2](params);
  pomodoro.setTitle(title ? `${title} — ${vault.site.title}` : vault.site.title);

  const matiere = path.startsWith('/m/') ? params[0] : path.startsWith('/n/') ? items.get(params[0])?.matiere : path.startsWith('/c/') ? canvases.get(`c/${params[0]}`)?.matiere : null;
  pomodoro.context = () => matiere ?? null;
  setWorkspace(matiere);
  setActive(path);

  view.classList.add('enter');
  const result = match ? await match[1](view, { params, query, alive: () => mine === token }) : notFound(view);
  if (mine !== token) {
    if (typeof result === 'function') result();
    return;
  }
  cleanup = typeof result === 'function' ? result : null;
  setTimeout(() => view.classList.remove('enter'), 400);
}

function toggleSidebar() {
  if (isMobile()) {
    document.body.classList.toggle('side-open');
    return;
  }
  const collapsed = sidebar.classList.toggle('collapsed');
  store.set('sidebar.collapsed', collapsed);
}

function rename() {
  const name = prompt('Comment tu t’appelles ?', store.get('name', ''));
  if (name == null) return;
  store.set('name', name.trim().slice(0, 30));
  if (currentPath === '/') {
    currentPath = null;
    route();
  }
}

function shortcuts(e) {
  const key = e.key.toLowerCase();
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if ((e.ctrlKey || e.metaKey) && key === 'k') {
    e.preventDefault();
    toggleLauncher();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && key === 'b') {
    e.preventDefault();
    toggleSidebar();
    return;
  }
  // e.code so that AZERTY keyboards work too.
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (e.altKey && digit) {
    const m = vault.matieres[Number(digit[1]) - 1];
    if (m) {
      e.preventDefault();
      go(`#/m/${m.id}`);
    }
    return;
  }
  if (e.key === 'Escape') {
    closePopover();
    document.body.classList.remove('side-open');
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || launcherOpen()) return;
  const actions = {
    '/': () => openLauncher(),
    g: () => go('#/graph'),
    e: () => go('#/etude'),
    h: () => go('#/'),
    p: () => pomodoro.toggle(),
    m: () => (songs.active && songs.current ? songs.toggle() : radio.toggle()),
    c: () => openSongs(),
  };
  if (actions[e.key]) {
    e.preventDefault();
    actions[e.key]();
  }
}

async function boot() {
  try {
    await loadVault();
  } catch (e) {
    view.innerHTML = `<div class="page center"><pre class="ascii big-ascii">(；′⌒\`)</pre><h1>Le site n'a pas pu charger ses données</h1>
      <p class="muted">${esc(e.message)}</p><p class="muted">Lance <code>npm run dev</code> puis ouvre l'adresse affichée (le site ne marche pas en ouvrant le fichier directement).</p></div>`;
    return;
  }
  initTheme(vault.site);
  applyReading();
  pomodoro.init(vault.site.pomodoro);
  if (vault.site.wallpaper) {
    const wp = $('.wallpaper');
    wp.classList.add('image');
    wp.style.backgroundImage = `url("${vault.site.wallpaper}")`;
  }
  if (store.get('sidebar.collapsed', false) && !isMobile()) sidebar.classList.add('collapsed');

  mountBar($('#bar'), { onMenu: toggleSidebar, onSearch: () => openLauncher() });
  mountSidebar(sidebar);
  mountDock($('#dock'));
  initLauncher($('#launcher'), { toggleSidebar, rename, openSongs });

  $('.scrim').addEventListener('click', () => document.body.classList.remove('side-open'));
  document.addEventListener('keydown', shortcuts);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-launch]')) openLauncher();
  });
  window.addEventListener('hashchange', route);
  route();
}

boot();
