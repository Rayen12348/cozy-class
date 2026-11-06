import { vault, matieres } from './data.js';
import { color, themeEvents } from './themes.js';
import { PanZoom } from './panzoom.js';
import { clamp, fold } from './util.js';

const TYPE_COLORS = { cours: 'blue', td: 'yellow', tp: 'green', correction: 'teal', resume: 'mauve', examen: 'red', autre: 'overlay2' };

// Whole-vault graph: one hub per matière + one node per note/document.
export function graphData() {
  const nodes = vault.matieres.map((m) => ({ id: `m:${m.id}`, label: m.name, kind: 'matiere', matiere: m.id, color: m.color }));
  const links = [];
  const seen = new Set();
  const link = (source, target, kind) => {
    const key = [source, target].sort().join('|');
    if (source === target || seen.has(key)) return;
    seen.add(key);
    links.push({ source, target, kind });
  };
  for (const it of vault.items) {
    nodes.push({ id: it.id, label: it.title, kind: 'item', type: it.type, matiere: it.matiere, color: matieres.get(it.matiere)?.color ?? 'overlay1' });
    if (it.matiere) link(`m:${it.matiere}`, it.id, 'member');
    for (const l of it.links) link(it.id, l, 'link');
  }
  return { nodes, links };
}

// Neighbourhood of a node, `depth` hops away (for the local graph).
export function localGraph(id, depth = 2) {
  const { nodes, links } = graphData();
  const keep = new Set([id]);
  for (let d = 0; d < depth; d++) {
    for (const l of links) {
      if (l.kind === 'member' && d > 0) continue;
      if (keep.has(l.source)) keep.add(l.target);
      else if (keep.has(l.target)) keep.add(l.source);
    }
  }
  return { nodes: nodes.filter((n) => keep.has(n.id)), links: links.filter((l) => keep.has(l.source) && keep.has(l.target)) };
}

export class ForceGraph {
  constructor(canvas, { nodes, links, onOpen, focus = null, compact = false, insetLeft = () => 0 }) {
    Object.assign(this, { canvas, onOpen, focus, compact, insetLeft });
    this.ctx = canvas.getContext('2d');
    this.colorBy = 'matiere';
    this.filter = () => true;
    this.highlight = null;
    this.hover = null;
    this.alpha = 1;
    this.alphaTarget = 0;
    this.autoFit = true;
    this.dirty = true;

    this.nodes = nodes.map((n) => ({ ...n, x: 0, y: 0, vx: 0, vy: 0, deg: 0 }));
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
    this.links = links.map((l) => ({ ...l, s: this.byId.get(l.source), t: this.byId.get(l.target) })).filter((l) => l.s && l.t);
    this.adj = new Map(this.nodes.map((n) => [n, new Set()]));
    for (const l of this.links) {
      l.s.deg++;
      l.t.deg++;
      this.adj.get(l.s).add(l.t);
      this.adj.get(l.t).add(l.s);
    }
    for (const n of this.nodes) n.r = n.kind === 'matiere' ? (compact ? 7 : 10) : clamp(3.2 + Math.sqrt(n.deg) * 1.3, 3.5, 9) * (compact ? 0.85 : 1);
    this.seed();
    this.refresh();

    this.pz = new PanZoom(canvas, {
      min: 0.08,
      max: 5,
      canPan: (e) => !this.hit(e),
      onChange: () => {
        this.autoFit = false;
        this.dirty = true;
      },
    });
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerleave', () => this.setHover(null));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.offTheme = themeEvents.on(() => (this.dirty = true));
    for (let i = 0; i < 40; i++) this.tick();
    const frame = () => {
      if (this.dead) return;
      const active = this.alpha > 0.003 || this.alphaTarget > 0;
      if (active) this.tick();
      if (active || this.dirty) {
        if (this.autoFit) this.fit(0.12);
        this.draw();
        this.dirty = false;
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  seed() {
    const hubs = this.nodes.filter((n) => n.kind === 'matiere');
    const R = 90 + hubs.length * 30;
    hubs.forEach((h, i) => {
      const a = (i / hubs.length) * Math.PI * 2;
      h.x = Math.cos(a) * R;
      h.y = Math.sin(a) * R;
    });
    for (const n of this.nodes) {
      if (n.kind === 'matiere') continue;
      const hub = this.byId.get(`m:${n.matiere}`);
      const a = Math.random() * Math.PI * 2;
      const d = 30 + Math.random() * 60;
      n.x = (hub?.x ?? 0) + Math.cos(a) * d;
      n.y = (hub?.y ?? 0) + Math.sin(a) * d;
    }
  }

  refresh() {
    this.visible = this.nodes.filter((n) => this.filter(n));
    const vis = new Set(this.visible);
    this.visibleLinks = this.links.filter((l) => vis.has(l.s) && vis.has(l.t));
    this.dirty = true;
  }
  setFilter(fn) {
    this.filter = fn;
    this.refresh();
    this.reheat(0.5);
  }
  setColorBy(mode) {
    this.colorBy = mode;
    this.dirty = true;
  }
  setHighlight(query) {
    const q = fold(query.trim());
    this.highlight = q ? new Set(this.nodes.filter((n) => fold(n.label).includes(q)).map((n) => n.id)) : null;
    this.dirty = true;
  }
  reheat(alpha = 0.3) {
    this.alpha = Math.max(this.alpha, alpha);
  }

  tick() {
    const nodes = this.visible;
    const a = this.alpha;
    const charge = this.compact ? -140 : -260;
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const q = nodes[j];
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let d2 = dx * dx + dy * dy;
        if (d2 > 360000) continue;
        if (d2 < 1) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d2 = 1;
        }
        const f = (charge * a) / d2;
        p.vx += dx * f;
        p.vy += dy * f;
        q.vx -= dx * f;
        q.vy -= dy * f;
      }
    }
    for (const l of this.visibleLinks) {
      const { s, t } = l;
      const dx = t.x + t.vx - s.x - s.vx;
      const dy = t.y + t.vy - s.y - s.vy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const dist = l.kind === 'member' ? (this.compact ? 55 : 80) : (this.compact ? 45 : 60);
      const k = ((d - dist) / d) * a * (1 / Math.min(s.deg, t.deg)) * (l.kind === 'member' ? 0.7 : 1);
      const bias = s.deg / (s.deg + t.deg);
      t.vx -= dx * k * bias;
      t.vy -= dy * k * bias;
      s.vx += dx * k * (1 - bias);
      s.vy += dy * k * (1 - bias);
    }
    const gravity = this.compact ? 0.06 : 0.035;
    for (const n of nodes) {
      n.vx -= n.x * gravity * a;
      n.vy -= n.y * gravity * a;
      if (n.fx != null) {
        n.x = n.fx;
        n.y = n.fy;
        n.vx = n.vy = 0;
      } else {
        n.x += n.vx *= 0.6;
        n.y += n.vy *= 0.6;
      }
    }
    this.alpha += (this.alphaTarget - this.alpha) * 0.0228;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    const first = !this.w;
    Object.assign(this, { w, h, dpr });
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    if (first) this.pz.t = { x: w / 2, y: h / 2, k: 1 };
    if (first || this.autoFit) this.fit(1);
    this.dirty = true;
  }

  // Eases the view toward the bounding box (ease = 1 jumps).
  fit(ease = 1) {
    if (!this.w || !this.visible.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of this.visible) {
      x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y);
    }
    const pad = this.compact ? 24 : 70;
    const left = this.insetLeft();
    const k = clamp(Math.min((this.w - left - pad * 2) / (x1 - x0 || 1), (this.h - pad * 2) / (y1 - y0 || 1)), 0.15, this.compact ? 1.4 : 1.6);
    const target = { k, x: left + (this.w - left) / 2 - ((x0 + x1) / 2) * k, y: this.h / 2 - ((y0 + y1) / 2) * k };
    const t = this.pz.t;
    t.k += (target.k - t.k) * ease;
    t.x += (target.x - t.x) * ease;
    t.y += (target.y - t.y) * ease;
    this.dirty = true;
  }
  zoomBy(f) {
    this.pz.zoomBy(f);
  }
  refit() {
    this.autoFit = true;
    this.fit(1);
  }

  hit(e) {
    const r = this.canvas.getBoundingClientRect();
    const { x, y, k } = this.pz.t;
    const wx = (e.clientX - r.left - x) / k;
    const wy = (e.clientY - r.top - y) / k;
    let best = null;
    let bd = Infinity;
    for (const n of this.visible) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < n.r + 6 / k && d < bd) {
        best = n;
        bd = d;
      }
    }
    return best;
  }
  setHover(n) {
    if (this.hover === n) return;
    this.hover = n;
    this.canvas.style.cursor = n ? 'pointer' : '';
    this.dirty = true;
  }
  onDown(e) {
    const n = this.hit(e);
    if (!n || e.button !== 0) return;
    this.drag = { n, x: e.clientX, y: e.clientY, moved: 0 };
    n.fx = n.x;
    n.fy = n.y;
    this.alphaTarget = 0.25;
    this.reheat(0.25);
  }
  onMove(e) {
    if (!this.drag) {
      if (e.target === this.canvas && !this.pz.pointers.size) this.setHover(this.hit(e));
      return;
    }
    const { k } = this.pz.t;
    const d = this.drag;
    d.moved += Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y);
    d.n.fx += (e.clientX - d.x) / k;
    d.n.fy += (e.clientY - d.y) / k;
    d.x = e.clientX;
    d.y = e.clientY;
    this.autoFit = false;
  }
  onUp() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.n.fx = d.n.fy = null;
    this.alphaTarget = 0;
    if (d.moved < 5) this.onOpen?.(d.n);
  }

  nodeColor(n) {
    if (this.colorBy === 'type' && n.kind === 'item') return color(TYPE_COLORS[n.type] ?? 'overlay2');
    return color(n.color);
  }

  draw() {
    const { ctx, w, h, dpr } = this;
    if (!w) return;
    const { x, y, k } = this.pz.t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate(x, y);
    ctx.scale(k, k);

    const anchor = this.hover ?? (this.drag?.n) ?? null;
    const lit = anchor ? new Set([anchor, ...this.adj.get(anchor)]) : null;
    const focus = this.focus ? this.byId.get(this.focus) : null;
    const accent = color('accent');

    ctx.lineWidth = 1.3 / k;
    for (const l of this.visibleLinks) {
      const on = anchor && (l.s === anchor || l.t === anchor);
      ctx.globalAlpha = lit ? (on ? 0.9 : 0.06) : l.kind === 'member' ? 0.28 : 0.55;
      ctx.strokeStyle = on ? accent : color(l.kind === 'member' ? 'surface2' : 'overlay0');
      ctx.beginPath();
      ctx.moveTo(l.s.x, l.s.y);
      ctx.lineTo(l.t.x, l.t.y);
      ctx.stroke();
    }

    for (const n of this.visible) {
      const dim = (lit && !lit.has(n)) || (this.highlight && !this.highlight.has(n.id));
      ctx.globalAlpha = dim ? 0.18 : 1;
      ctx.fillStyle = this.nodeColor(n);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      if (n.kind === 'matiere' || n === focus || n === anchor) {
        ctx.lineWidth = (n === focus ? 3 : 2) / k;
        ctx.strokeStyle = n === focus ? accent : color('base');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (n === focus ? 4 : 2.5) / k, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const fade = clamp((k - 0.5) / 0.4, 0, 1);
    for (const n of this.visible) {
      const hub = n.kind === 'matiere';
      const forced = hub || n === focus || (lit && lit.has(n)) || (this.highlight && this.highlight.has(n.id));
      let alpha = forced ? 1 : fade;
      if ((lit && !lit.has(n)) || (this.highlight && !this.highlight.has(n.id))) alpha *= 0.15;
      if (alpha < 0.02) continue;
      const size = (hub ? 13 : 11) / Math.max(k, 0.8) * (this.compact ? 0.9 : 1);
      ctx.font = `${hub ? 700 : 500} ${size}px "JetBrains Mono", monospace`;
      ctx.globalAlpha = alpha;
      const label = n.label.length > 30 ? `${n.label.slice(0, 29)}…` : n.label;
      ctx.lineWidth = 3 / k;
      ctx.strokeStyle = color('base');
      ctx.strokeText(label, n.x, n.y + n.r + 4 / k);
      ctx.fillStyle = color(hub ? 'text' : 'subtext1');
      ctx.fillText(label, n.x, n.y + n.r + 4 / k);
    }
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.pz.destroy();
    this.offTheme();
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
  }
}
