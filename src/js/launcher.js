import { vault, items, matieres, typeOf, itemIcon, matiereEmoji, cssColor, recent, loadSearch, progress } from './data.js';
import { THEMES, ACCENTS, applyTheme, current } from './themes.js';
import { pomodoro } from './pomodoro.js';
import { radio, musicApp } from './music.js';
import { ambience, SOUNDS } from './audio.js';
import { icon } from './icons.js';
import { esc, fuzzy, highlight, fold, go, store } from './util.js';

const MODES = [
  { id: 'drun', label: 'tout', icon: 'search' },
  { id: 'notes', label: 'notes', icon: 'file' },
  { id: 'matieres', label: 'matières', icon: 'folder' },
  { id: 'run', label: 'actions', icon: 'terminal' },
];

let el;
let input;
let list;
let mode = 'drun';
let entries = [];
let sel = 0;
let lastFocus = null;
let searchToken = 0;
let hooks = {};

function noteEntries() {
  const out = vault.items.map((it) => {
    const m = matieres.get(it.matiere);
    return {
      kind: 'note', label: it.title, sub: `${m ? m.name : 'Général'} · ${typeOf(it).label}`,
      icon: itemIcon(it), color: `var(--${typeOf(it).color})`, done: progress.has(it.id),
      keys: `${it.title} ${m?.name ?? ''} ${typeOf(it).label} ${it.tags.join(' ')}`,
      run: () => go(`#/n/${it.id}`), id: it.id,
    };
  });
  for (const c of vault.canvases.filter((c) => !c.auto)) {
    out.push({ kind: 'note', label: c.title, sub: `${matieres.get(c.matiere)?.name ?? 'Général'} · Canvas`, icon: icon('canvas'), color: 'var(--peach)', keys: `${c.title} canvas`, run: () => go(`#/c/${c.id.slice(2)}`) });
  }
  return out;
}

function matiereEntries() {
  return vault.matieres.map((m, i) => ({
    kind: 'matiere', label: m.name, sub: `${m.items.length} documents${i < 9 ? ` · alt ${i + 1}` : ''}`,
    emoji: matiereEmoji(m), color: cssColor(m.color), keys: `${m.name} ${m.description} ${m.prof ?? ''}`,
    run: () => go(`#/m/${m.id}`),
  }));
}

function actionEntries() {
  const a = (label, ic, run, keys = '', sub = '') => ({ kind: 'action', label, icon: icon(ic), sub, keys: `${label} ${keys}`, run, color: 'var(--accent)' });
  const noteId = /^#\/n\/([^?]+)/.exec(location.hash)?.[1];
  const list = [
    a('Accueil', 'home', () => go('#/'), 'home', 'h'),
    a('Vue graphe', 'graph', () => go('#/graph'), 'graph liens', 'g'),
    a("Salle d'étude", 'coffee', () => go('#/etude'), 'pomodoro musique focus etude', 'e'),
    a(pomodoro.running ? 'Pomodoro : pause' : 'Pomodoro : démarrer', 'timer', () => pomodoro.toggle(), 'timer focus', 'p'),
    a('Pomodoro : réinitialiser', 'reset', () => pomodoro.reset(), 'timer'),
    a('Pomodoro : passer à la suite', 'skip', () => pomodoro.skip(), 'timer'),
    a(radio.playing ? 'Musique : pause' : 'Musique : lecture', 'music', () => radio.toggle(), 'radio lofi play'),
    a('Musique : station suivante', 'skip', () => radio.next(), 'radio lofi next'),
    ...(musicApp() ? [a(`Ouvrir ${musicApp().name ?? 'Metrolist'} (YouTube Music)`, 'music', () => window.open(musicApp().url, '_blank', 'noopener'), 'metrolist youtube music chanson spotify playlist', 'sur ton ordi')] : []),
    ...SOUNDS.map((s) => a(`Ambiance : ${s.label}${ambience.isOn(s.id) ? ' (couper)' : ''}`, s.icon, () => ambience.toggle(s.id), 'son bruit ambiance')),
    a('Ambiance : tout couper', 'mute', () => ambience.stopAll(), 'silence son'),
    a('Note au hasard', 'dice', () => {
      const pool = vault.items.filter((i) => !progress.has(i.id));
      const pick = (pool.length ? pool : vault.items)[Math.floor(Math.random() * (pool.length || vault.items.length))];
      if (pick) go(`#/n/${pick.id}`);
    }, 'random aleatoire reviser'),
    a('Afficher / masquer la barre latérale', 'menu', () => hooks.toggleSidebar?.(), 'sidebar explorateur', 'ctrl b'),
    a('Changer mon prénom', 'type', () => hooks.rename?.(), 'nom name'),
    ...Object.entries(THEMES).map(([id, t]) => a(`Thème : ${t.label}`, 'palette', () => applyTheme(id, current.accent), 'theme couleur', id === current.theme ? 'actuel' : '')),
    ...ACCENTS.map((c) => ({ ...a(`Accent : ${c}`, 'sparkles', () => applyTheme(current.theme, c), 'couleur accent', c === current.accent ? 'actuel' : ''), color: `var(--${c})` })),
  ];
  if (noteId && items.has(noteId)) {
    list.unshift(a(progress.has(noteId) ? 'Marquer comme non lu' : 'Marquer comme lu', 'check', () => progress.toggle(noteId), 'lu fait done progress'));
  }
  return list;
}

function compute() {
  const q = input.value.trim();
  const pools = {
    notes: noteEntries,
    matieres: matiereEntries,
    run: actionEntries,
    drun: () => [...matiereEntries(), ...noteEntries(), ...actionEntries()],
  };
  let pool = pools[mode]();
  if (!q) {
    if (mode === 'drun') {
      const notes = noteEntries();
      const recentEntries = recent.list().slice(0, 5).map((id) => notes.find((e) => e.id === id)).filter(Boolean).map((e) => ({ ...e, group: 'récents' }));
      pool = [...recentEntries, ...matiereEntries().map((e) => ({ ...e, group: 'matières' })), ...actionEntries().slice(0, 4).map((e) => ({ ...e, group: 'actions' }))];
    }
    entries = pool;
  } else {
    const kindBoost = { matiere: 25, note: 10, action: 0 };
    entries = pool
      .map((e) => ({ ...e, score: fuzzy(q, e.keys) + (kindBoost[e.kind] ?? 0) + (fuzzy(q, e.label) > 0 ? 30 : 0) }))
      .filter((e) => e.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 60);
    if (q.length >= 3 && (mode === 'drun' || mode === 'notes')) contentSearch(q);
  }
  sel = 0;
  render(q);
}

// Full-text hits are appended asynchronously once search.json is loaded.
async function contentSearch(q) {
  const token = ++searchToken;
  const index = await loadSearch();
  if (token !== searchToken || el.hidden) return;
  const fq = fold(q);
  const already = new Set(entries.map((e) => e.id).filter(Boolean));
  const hits = [];
  for (const [id, text] of index) {
    if (already.has(id)) continue;
    const ft = fold(text);
    const at = ft.indexOf(fq);
    if (at < 0) continue;
    const it = items.get(id);
    const start = Math.max(0, at - 40);
    const snippet = `${start ? '…' : ''}${text.slice(start, at + q.length + 70)}…`;
    hits.push({ kind: 'note', group: 'dans le contenu', label: it.title, sub: `${matieres.get(it.matiere)?.name ?? ''} · ${typeOf(it).label}`, snippet, icon: itemIcon(it), color: `var(--${typeOf(it).color})`, run: () => go(`#/n/${id}`), id });
    if (hits.length >= 15) break;
  }
  if (!hits.length) return;
  entries = [...entries, ...hits];
  render(q);
}

function render(q) {
  let group = null;
  list.innerHTML = entries.map((e, i) => {
    const header = e.group && e.group !== group ? `<li class="rofi-group">${esc(e.group)}</li>` : '';
    group = e.group ?? group;
    const ic = e.emoji ? `<span class="rofi-emoji">${e.emoji}</span>` : e.icon;
    return `${header}<li class="rofi-el ${i === sel ? 'sel' : ''}" data-i="${i}" role="option" aria-selected="${i === sel}" style="--c:${e.color ?? 'var(--accent)'}">
      <span class="rofi-icon">${ic}</span>
      <span class="rofi-text"><span class="rofi-label">${highlight(e.label, q)}${e.done ? ` <span class="rofi-done">${icon('tick')}</span>` : ''}</span>${e.snippet ? `<span class="rofi-snippet">${highlight(e.snippet, q)}</span>` : ''}</span>
      <span class="rofi-sub">${esc(e.sub ?? '')}</span>
    </li>`;
  }).join('') || '<li class="rofi-empty">rien trouvé… (｡•́︿•̀｡)</li>';
  el.querySelector('.rofi-count').textContent = `${entries.length ? sel + 1 : 0}/${entries.length}`;
  el.querySelectorAll('.rofi-mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  el.querySelector('.rofi-prompt-label').textContent = MODES.find((m) => m.id === mode).label;
}

function move(delta) {
  if (!entries.length) return;
  sel = (sel + delta + entries.length) % entries.length;
  list.querySelectorAll('.rofi-el').forEach((li) => {
    const on = Number(li.dataset.i) === sel;
    li.classList.toggle('sel', on);
    li.setAttribute('aria-selected', on);
    if (on) li.scrollIntoView({ block: 'nearest' });
  });
  el.querySelector('.rofi-count').textContent = `${sel + 1}/${entries.length}`;
}

function run(i = sel) {
  const e = entries[i];
  if (!e) return;
  close();
  e.run();
}

function setMode(m) {
  mode = m;
  store.set('launcher.mode', m);
  compute();
  input.focus();
}

export function initLauncher(host, h = {}) {
  hooks = h;
  el = host;
  mode = store.get('launcher.mode', 'drun');
  el.innerHTML = `
    <div class="rofi" role="dialog" aria-label="Lanceur">
      <div class="rofi-bar">
        <span class="rofi-prompt">${icon('search')}<span class="rofi-prompt-label"></span></span>
        <input class="rofi-input" placeholder="chercher une note, une matière, une action…" autocomplete="off" spellcheck="false" aria-label="Rechercher">
        <span class="rofi-count"></span>
      </div>
      <div class="rofi-modes">${MODES.map((m) => `<button class="rofi-mode" data-mode="${m.id}">${icon(m.icon)} ${m.label}</button>`).join('')}</div>
      <ul class="rofi-list" role="listbox"></ul>
      <div class="rofi-foot hide-sm"><span><kbd>↑↓</kbd> naviguer</span><span><kbd>↵</kbd> ouvrir</span><span><kbd>tab</kbd> mode</span><span><kbd>esc</kbd> fermer</span></div>
    </div>`;
  input = el.querySelector('.rofi-input');
  list = el.querySelector('.rofi-list');
  input.addEventListener('input', compute);
  input.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowDown' || (e.ctrlKey && (k === 'j' || k === 'n'))) { e.preventDefault(); move(1); }
    else if (k === 'ArrowUp' || (e.ctrlKey && (k === 'k' || k === 'p'))) { e.preventDefault(); move(-1); }
    else if (k === 'PageDown') { e.preventDefault(); move(8); }
    else if (k === 'PageUp') { e.preventDefault(); move(-8); }
    else if (k === 'Enter') { e.preventDefault(); run(); }
    else if (k === 'Tab') {
      e.preventDefault();
      const i = MODES.findIndex((m) => m.id === mode);
      setMode(MODES[(i + (e.shiftKey ? -1 : 1) + MODES.length) % MODES.length].id);
    } else if (k === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('.rofi-el');
    if (li && Number(li.dataset.i) !== sel) move(Number(li.dataset.i) - sel);
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.rofi-el');
    if (li) run(Number(li.dataset.i));
  });
  el.querySelector('.rofi-modes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (b) setMode(b.dataset.mode);
  });
  el.addEventListener('mousedown', (e) => {
    if (e.target === el) close();
  });
}

export function openLauncher(withMode) {
  if (withMode) mode = withMode;
  lastFocus = document.activeElement;
  el.hidden = false;
  input.value = '';
  compute();
  requestAnimationFrame(() => input.focus());
}

export function close() {
  el.hidden = true;
  searchToken++;
  lastFocus?.focus?.();
}

export const toggleLauncher = () => (el.hidden ? openLauncher() : close());
export const launcherOpen = () => !el.hidden;
