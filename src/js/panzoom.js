import { clamp } from './util.js';

// Pan (drag), zoom (wheel / pinch) for an element. Transform: screen = world * k + (x, y).
export class PanZoom {
  constructor(el, { onChange, min = 0.1, max = 4, canPan = () => true, canWheel = () => true } = {}) {
    Object.assign(this, { el, onChange, min, max, canPan, canWheel });
    this.t = { x: 0, y: 0, k: 1 };
    this.pointers = new Map();
    this.moved = 0;
    this.pinch = null;
    for (const m of ['onWheel', 'onDown', 'onMove', 'onUp']) this[m] = this[m].bind(this);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  local(e) {
    const r = this.el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  set(t) {
    Object.assign(this.t, t);
    this.onChange?.(this.t);
  }
  zoomAt(sx, sy, factor) {
    const k = clamp(this.t.k * factor, this.min, this.max);
    const f = k / this.t.k;
    this.set({ x: sx - (sx - this.t.x) * f, y: sy - (sy - this.t.y) * f, k });
  }
  zoomBy(factor) {
    this.zoomAt(this.el.clientWidth / 2, this.el.clientHeight / 2, factor);
  }

  onWheel(e) {
    if (!this.canWheel(e)) return;
    e.preventDefault();
    // Trackpads send small pixel deltas (and deltaX): pan. Mouse wheels and pinch (ctrlKey): zoom.
    const trackpadPan = !e.ctrlKey && e.deltaMode === 0 && (e.deltaX !== 0 || Math.abs(e.deltaY) < 30);
    if (e.shiftKey || trackpadPan) {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      this.set({ x: this.t.x - dx, y: this.t.y - (e.shiftKey ? 0 : e.deltaY) });
      return;
    }
    const [sx, sy] = this.local(e);
    const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    this.zoomAt(sx, sy, Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0018)));
  }
  onDown(e) {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 0 && !this.canPan(e)) return;
    this.pointers.set(e.pointerId, this.local(e));
    if (this.pointers.size === 1) this.moved = 0;
    if (this.pointers.size === 2) this.pinch = this.pinchState();
    this.el.classList.add('panning');
  }
  pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { dist: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  }
  onMove(e) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = this.local(e);
    this.pointers.set(e.pointerId, cur);
    if (this.pointers.size === 1) {
      const dx = cur[0] - prev[0];
      const dy = cur[1] - prev[1];
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.set({ x: this.t.x + dx, y: this.t.y + dy });
    } else if (this.pointers.size === 2 && this.pinch) {
      const p = this.pinchState();
      this.moved += 10;
      this.set({ x: this.t.x + p.mid[0] - this.pinch.mid[0], y: this.t.y + p.mid[1] - this.pinch.mid[1] });
      this.zoomAt(p.mid[0], p.mid[1], p.dist / this.pinch.dist);
      this.pinch = p;
    }
  }
  onUp(e) {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size < 2) this.pinch = null;
    if (!this.pointers.size) this.el.classList.remove('panning');
  }
  destroy() {
    this.el.removeEventListener('wheel', this.onWheel);
    this.el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
