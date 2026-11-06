import { matieres, matiereEmoji } from '../data.js';
import { mountTimer, mountSettings, stats, pomodoro } from '../pomodoro.js';
import { mountMixer, mountRadio } from '../music.js';
import { ambience } from '../audio.js';
import { color } from '../themes.js';
import { icon } from '../icons.js';
import { esc, store, today, reducedMotion } from '../util.js';

const QUOTES = [
  'Un pomodoro à la fois. 🍅',
  'Petit à petit, l’oiseau fait son nid.',
  'Le plus dur, c’est de commencer — et tu es déjà là.',
  'Fais-le moins bien, mais fais-le.',
  'Bois un peu d’eau ☕ (ou du thé).',
  'La régularité bat l’intensité.',
];

// Background scene: rain when it rains, embers by the fire, drifting dust otherwise.
function scene(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = 0;
  const drops = [], embers = [], dust = [];
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  for (let i = 0; i < 40; i++) dust.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, s: 0.02 + Math.random() * 0.05, p: Math.random() * 6 });

  const frame = (time) => {
    ctx.clearRect(0, 0, w, h);
    const rain = ambience.isOn('pluie');
    const fire = ambience.isOn('feu');
    if (rain && drops.length < 140) for (let i = 0; i < 4; i++) drops.push({ x: Math.random() * (w + 200), y: -20, v: 7 + Math.random() * 6, l: 10 + Math.random() * 16 });
    if (fire && embers.length < 50 && Math.random() < 0.35) embers.push({ x: w * (0.2 + Math.random() * 0.6), y: h + 5, v: 0.4 + Math.random() * 1.1, life: 1, p: Math.random() * 6 });

    ctx.strokeStyle = color('sky');
    ctx.lineWidth = 1.2;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.v;
      d.x -= d.v * 0.25;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.l * 0.25, d.y - d.l);
      ctx.stroke();
      if (d.y > h + 20) drops.splice(i, 1);
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.y -= e.v;
      e.x += Math.sin(time / 600 + e.p) * 0.5;
      e.life -= 0.0035;
      ctx.globalAlpha = Math.max(0, e.life) * 0.8;
      ctx.fillStyle = e.life > 0.5 ? color('yellow') : color('peach');
      ctx.beginPath();
      ctx.arc(e.x, e.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      if (e.life <= 0) embers.splice(i, 1);
    }
    ctx.fillStyle = color('text');
    for (const d of dust) {
      d.y -= d.s / h * 4;
      if (d.y < -0.02) d.y = 1.02;
      ctx.globalAlpha = 0.08 + Math.sin(time / 1500 + d.p) * 0.06;
      ctx.beginPath();
      ctx.arc(d.x * w + Math.sin(time / 4000 + d.p) * 12, d.y * h, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  if (!reducedMotion()) raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

function mountTodos(el) {
  let todos = store.get('todos', []);
  const save = () => store.set('todos', todos);
  const render = () => {
    el.innerHTML = `
      <form class="todo-add"><input class="field" placeholder="ajouter une tâche… (entrée)" maxlength="120"></form>
      <ul class="todos">${todos.map((t, i) => `<li class="${t.done ? 'done' : ''}"><button class="todo-check" data-i="${i}">${t.done ? icon('tick') : ''}</button><span>${esc(t.text)}</span><button class="icon-btn sm" data-del="${i}" title="Supprimer">${icon('x')}</button></li>`).join('')}</ul>
      ${todos.some((t) => t.done) ? '<button class="btn sm ghost" data-clear>effacer les tâches faites</button>' : ''}`;
  };
  el.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = el.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    todos.push({ text, done: false });
    save();
    render();
    el.querySelector('input').focus();
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.i) todos[b.dataset.i].done = !todos[b.dataset.i].done;
    else if (b.dataset.del) todos.splice(Number(b.dataset.del), 1);
    else if (b.hasAttribute('data-clear')) todos = todos.filter((t) => !t.done);
    else return;
    save();
    render();
  });
  render();
}

function mountStats(el) {
  const render = () => {
    const all = stats.all();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { d, key: today(d), ...(all[today(d)] ?? { count: 0, minutes: 0 }) };
    });
    const week = days.reduce((n, d) => n + d.count, 0);
    const max = Math.max(4, ...days.map((d) => d.count));
    const by = Object.entries(all[today()]?.by ?? {}).map(([id, n]) => [matieres.get(id), n]).filter(([m]) => m);
    el.innerHTML = `
      <div class="stat-big"><b>${all[today()]?.count ?? 0}</b> 🍅 aujourd'hui <span class="muted">· ${all[today()]?.minutes ?? 0} min · ${week} cette semaine</span></div>
      <div class="week">${days.map((d) => `<div class="day" title="${d.count} pomodoro(s) · ${d.minutes} min"><span class="day-cell" style="--v:${d.count / max}">${d.count || ''}</span><small>${d.d.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</small></div>`).join('')}</div>
      ${by.length ? `<div class="by-m">${by.map(([m, n]) => `<span class="badge" style="--c:var(--${m.color})">${matiereEmoji(m)} ${esc(m.name)} · ${n}</span>`).join('')}</div>` : '<p class="muted small">Ouvre une matière pendant un pomodoro pour qu’il lui soit compté.</p>'}`;
  };
  render();
  return pomodoro.events.on(() => {
    if (!pomodoro.running) render();
  });
}

export function renderStudy(view) {
  view.innerHTML = `<div class="study">
    <canvas class="study-bg" aria-hidden="true"></canvas>
    <section class="card study-timer">
      <div class="timer-host"></div>
      <p class="quote muted">${QUOTES[Math.floor(Math.random() * QUOTES.length)]}</p>
    </section>
    <section class="card"><div class="panel-title">${icon('waves')} ambiance</div><div class="mixer"></div></section>
    <section class="card"><div class="panel-title">${icon('radio')} radio lofi</div><div class="radio"></div></section>
    <section class="card"><div class="panel-title">${icon('list')} pour cette session</div><div class="todo-host"></div></section>
    <section class="card"><div class="panel-title">${icon('sparkles')} statistiques</div><div class="stats-host"></div></section>
    <details class="card study-settings"><summary class="panel-title">${icon('timer')} réglages du pomodoro ${icon('chevron', 'chev')}</summary><div class="settings-host"></div></details>
  </div>`;
  const offs = [
    scene(view.querySelector('.study-bg')),
    mountTimer(view.querySelector('.timer-host')),
    mountMixer(view.querySelector('.mixer')),
    mountRadio(view.querySelector('.radio')),
    mountStats(view.querySelector('.stats-host')),
  ];
  mountTodos(view.querySelector('.todo-host'));
  mountSettings(view.querySelector('.settings-host'));
  return () => offs.forEach((off) => off?.());
}
