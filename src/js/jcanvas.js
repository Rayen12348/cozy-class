// Renders a JSON Canvas (https://jsoncanvas.org — Obsidian's .canvas format).
import { items, matieres, badge, noteHtml, progress, matiereEmoji } from './data.js';
import { PanZoom } from './panzoom.js';
import { icon } from './icons.js';
import { esc, store, clamp, fmtSize } from './util.js';
import { enhance } from './enhance.js';

const PRESETS = { 1: 'red', 2: 'peach', 3: 'yellow', 4: 'green', 5: 'teal', 6: 'mauve' };
const NORMAL = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
const ARROW = 11;
const GRID = 24;

const colorCss = (c) => (!c ? null : c.startsWith('#') ? c : `var(--${PRESETS[c] ?? c})`);
const r1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => `${r1(p[0])},${r1(p[1])}`;

function anchor(n, side) {
  if (side === 'top') return [n.x + n.width / 2, n.y];
  if (side === 'bottom') return [n.x + n.width / 2, n.y + n.height];
  if (side === 'left') return [n.x, n.y + n.height / 2];
  return [n.x + n.width, n.y + n.height / 2];
}

function autoSides(a, b) {
  const dx = b.x + b.width / 2 - (a.x + a.width / 2);
  const dy = b.y + b.height / 2 - (a.y + a.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? ['right', 'left'] : ['left', 'right'];
  return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}

function arrowHead(tip, n) {
  const base = [tip[0] + n[0] * ARROW, tip[1] + n[1] * ARROW];
  const perp = [-n[1] * 6, n[0] * 6];
  return `<path class="head" d="M${pt(tip)} L${pt([base[0] + perp[0], base[1] + perp[1]])} L${pt([base[0] - perp[0], base[1] - perp[1]])} Z"/>`;
}

function fileCard(it, n) {
  const big = n.height >= 260 && it.kind === 'note';
  let body;
  if (it.kind === 'image') body = `<img class="jc-img" src="${it.url}" alt="" draggable="false">`;
  else if (big) body = `<div class="jc-scroll prose prose-sm" data-load="${it.id}"></div>`;
  else body = `<div class="jc-excerpt">${esc(it.excerpt || (it.kind === 'pdf' ? `Document PDF · ${fmtSize(it.size)}` : it.kind === 'file' ? `Fichier .${it.ext} · ${fmtSize(it.size)}` : ''))}</div>`;
  return `<div class="jc-file">
    <div class="jc-file-head">${badge(it)}<span class="jc-done" title="Lu">${icon('tick')}</span></div>
    <div class="jc-title">${esc(it.title)}</div>${body}</div>`;
}

function nodeContent(n) {
  if (n.type === 'group') return `<div class="jc-group-label">${esc(n.label ?? '')}</div>`;
  if (n.type === 'text') return `<div class="jc-scroll prose prose-sm">${n.html ?? esc(n.text ?? '')}</div>`;
  if (n.type === 'link') {
    let host = n.url;
    try {
      host = new URL(n.url).hostname.replace(/^www\./, '');
    } catch { /* keep raw */ }
    return `<a class="jc-link" href="${esc(n.url)}" target="_blank" rel="noopener" draggable="false"><span class="jc-link-host">${icon('link')} ${esc(host)}</span><span class="jc-link-url">${esc(n.url)}</span></a>`;
  }
  const it = n.ref && items.get(n.ref);
  if (it) return fileCard(it, n);
  const m = n.matiereRef && matieres.get(n.matiereRef);
  if (m) return `<div class="jc-file"><div class="jc-title">${esc(m.name)}</div><div class="jc-excerpt">${esc(m.description)}</div></div>`;
  if (n.src) return `<img class="jc-img" src="${n.src}" alt="" draggable="false">`;
  return `<div class="jc-file missing">${icon('file')} <span>${esc(n.file ?? 'fichier introuvable')}</span></div>`;
}

const openTarget = (n) => (n.ref ? `#/n/${n.ref}${n.heading ? `?h=${n.heading}` : ''}` : n.matiereRef ? `#/m/${n.matiereRef}` : null);

export function mountCanvas(host, canvas) {
  host.classList.add('jc');
  host.innerHTML = `
    <div class="jc-world"><svg class="jc-edges"></svg><div class="jc-labels"></div></div>
    <div class="jc-controls">
      <button class="icon-btn" data-z="in" title="Zoomer">${icon('plus')}</button>
      <button class="icon-btn" data-z="out" title="Dézoomer">${icon('minus')}</button>
      <button class="icon-btn" data-z="fit" title="Tout voir">${icon('fit')}</button>
      <button class="icon-btn" data-z="reset" title="Remettre les cartes en place" hidden>${icon('reset')}</button>
    </div>
    <div class="jc-hint hide-sm">glisser : déplacer · molette : zoom · clic : ouvrir</div>`;
  const world = host.querySelector('.jc-world');
  const svg = host.querySelector('.jc-edges');
  const labels = host.querySelector('.jc-labels');
  const resetBtn = host.querySelector('[data-z="reset"]');

  const posKey = `canvas.pos.${canvas.id}`;
  const saved = store.get(posKey, {});
  resetBtn.hidden = !Object.keys(saved).length;
  const nodes = canvas.nodes.map((n) => ({ ...n, ...(saved[n.id] ? { x: saved[n.id][0], y: saved[n.id][1] } : {}) }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const place = (n) => Object.assign(n.el.style, { left: `${n.x}px`, top: `${n.y}px`, width: `${n.width}px`, height: `${n.height}px` });
  const ordered = [...nodes.filter((n) => n.type === 'group').sort((a, b) => b.width * b.height - a.width * a.height), ...nodes.filter((n) => n.type !== 'group')];
  for (const n of ordered) {
    const el = document.createElement('div');
    el.className = `jc-node jc-${n.type}`;
    el.dataset.id = n.id;
    const c = colorCss(n.color);
    if (c) el.style.setProperty('--c', c);
    const target = openTarget(n);
    if (target) el.dataset.open = target;
    if (n.ref) el.dataset.ref = n.ref;
    el.innerHTML = nodeContent(n);
    n.el = el;
    place(n);
    world.append(el);
  }
  for (const el of world.querySelectorAll('[data-load]')) {
    noteHtml(el.dataset.load).then((html) => {
      el.innerHTML = html;
      enhance(el, { id: el.dataset.load, depth: 1 });
    }).catch(() => {});
  }
  enhance(world, { depth: 1 });
  const markDone = () => world.querySelectorAll('[data-ref]').forEach((el) => el.classList.toggle('done', progress.has(el.dataset.ref)));
  markDone();
  const offProgress = progress.events.on(markDone);

  function drawEdges() {
    let paths = '';
    let html = '';
    for (const e of canvas.edges) {
      const a = byId.get(e.fromNode);
      const b = byId.get(e.toNode);
      if (!a || !b) continue;
      const auto = autoSides(a, b);
      const fs = e.fromSide ?? auto[0];
      const ts = e.toSide ?? auto[1];
      const n1 = NORMAL[fs];
      const n2 = NORMAL[ts];
      const p1 = anchor(a, fs);
      const p2 = anchor(b, ts);
      const toArrow = (e.toEnd ?? 'arrow') === 'arrow';
      const fromArrow = e.fromEnd === 'arrow';
      const q1 = fromArrow ? [p1[0] + n1[0] * ARROW, p1[1] + n1[1] * ARROW] : p1;
      const q2 = toArrow ? [p2[0] + n2[0] * ARROW, p2[1] + n2[1] * ARROW] : p2;
      const bend = clamp(Math.hypot(q2[0] - q1[0], q2[1] - q1[1]) * 0.45, 30, 220);
      const c1 = [q1[0] + n1[0] * bend, q1[1] + n1[1] * bend];
      const c2 = [q2[0] + n2[0] * bend, q2[1] + n2[1] * bend];
      const c = colorCss(e.color);
      paths += `<g${c ? ` style="--c:${c}"` : ''}><path class="line" d="M${pt(q1)} C${pt(c1)} ${pt(c2)} ${pt(q2)}"/>${toArrow ? arrowHead(p2, n2) : ''}${fromArrow ? arrowHead(p1, n1) : ''}</g>`;
      if (e.label) {
        const mid = [0, 1].map((i) => (q1[i] + 3 * c1[i] + 3 * c2[i] + q2[i]) / 8);
        html += `<div class="jc-label" style="left:${mid[0]}px;top:${mid[1]}px${c ? `;--c:${c}` : ''}">${esc(e.label)}</div>`;
      }
    }
    svg.innerHTML = paths;
    labels.innerHTML = html;
  }
  drawEdges();

  const apply = (t) => {
    world.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`;
    host.style.backgroundSize = `${GRID * t.k}px ${GRID * t.k}px`;
    host.style.backgroundPosition = `${t.x}px ${t.y}px`;
  };
  const scrollable = (e) => {
    const s = e.target.closest?.('.jc-scroll');
    return s && s.scrollHeight > s.clientHeight + 2;
  };
  const pz = new PanZoom(host, {
    min: 0.12,
    max: 2.5,
    onChange: apply,
    canPan: (e) => e.pointerType === 'touch' || !e.target.closest('.jc-node, .jc-controls'),
    canWheel: (e) => !scrollable(e) && !e.target.closest('.jc-controls'),
  });

  function fit() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h || !nodes.length) return;
    const x0 = Math.min(...nodes.map((n) => n.x));
    const y0 = Math.min(...nodes.map((n) => n.y - (n.type === 'group' ? 36 : 0)));
    const x1 = Math.max(...nodes.map((n) => n.x + n.width));
    const y1 = Math.max(...nodes.map((n) => n.y + n.height));
    const pad = w < 600 ? 20 : 56;
    const k = clamp(Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0)), 0.2, 1);
    if (k < 0.45 && w < 700) {
      pz.set({ k: 0.6, x: pad - x0 * 0.6, y: pad - y0 * 0.6 });
      return;
    }
    pz.set({ k, x: (w - (x1 - x0) * k) / 2 - x0 * k, y: (h - (y1 - y0) * k) / 2 - y0 * k });
  }
  apply(pz.t);
  requestAnimationFrame(fit);

  // Drag cards with the mouse (groups carry their contents). Positions are remembered per browser.
  let drag = null;
  let dragMoved = 0;
  const onDown = (e) => {
    const el = e.target.closest('.jc-node');
    if (!el || e.button !== 0 || e.pointerType === 'touch' || e.target.closest('a, button, input, summary')) return;
    if (scrollable(e) && e.offsetX > e.target.clientWidth - 14) return; // grabbing a scrollbar
    const n = byId.get(el.dataset.id);
    const inside = (c) => c !== n && c.x >= n.x && c.y >= n.y && c.x + c.width <= n.x + n.width && c.y + c.height <= n.y + n.height;
    const carried = n.type === 'group' ? nodes.filter(inside) : [];
    drag = { list: [n, ...carried].map((m) => ({ m, x: m.x, y: m.y })), sx: e.clientX, sy: e.clientY };
    dragMoved = 0;
  };
  const onMove = (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.sx) / pz.t.k;
    const dy = (e.clientY - drag.sy) / pz.t.k;
    dragMoved = Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy);
    if (dragMoved < 4) return;
    for (const d of drag.list) {
      d.m.x = Math.round(d.x + dx);
      d.m.y = Math.round(d.y + dy);
      d.m.el.classList.add('dragging');
      place(d.m);
    }
    drawEdges();
  };
  const onUp = () => {
    if (!drag) return;
    drag.list.forEach((d) => d.m.el.classList.remove('dragging'));
    if (dragMoved >= 4) {
      const pos = store.get(posKey, {});
      for (const d of drag.list) pos[d.m.id] = [d.m.x, d.m.y];
      store.set(posKey, pos);
      resetBtn.hidden = false;
    }
    drag = null;
  };
  const onClick = (e) => {
    if (dragMoved >= 4 || pz.moved > 8) return;
    if (e.target.closest('a, button, input, summary, .jc-scroll')) return;
    const target = e.target.closest('.jc-node[data-open]')?.dataset.open;
    if (target) location.hash = target;
  };
  host.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  host.addEventListener('click', onClick);
  host.querySelector('.jc-controls').addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]')?.dataset.z;
    if (z === 'in') pz.zoomBy(1.25);
    if (z === 'out') pz.zoomBy(0.8);
    if (z === 'fit') fit();
    if (z === 'reset') {
      store.set(posKey, {});
      for (const n of nodes) {
        const orig = canvas.nodes.find((o) => o.id === n.id);
        Object.assign(n, { x: orig.x, y: orig.y });
        place(n);
      }
      drawEdges();
      resetBtn.hidden = true;
    }
  });

  return () => {
    pz.destroy();
    offProgress();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
}
