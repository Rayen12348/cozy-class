import { canvases, matieres, matiereEmoji } from '../data.js';
import { mountCanvas } from '../jcanvas.js';
import { icon } from '../icons.js';
import { esc } from '../util.js';
import { notFound } from './notfound.js';

// Standalone page for a .canvas file (also reachable as a tab of its matière).
export function renderCanvasPage(view, { params: [id] }) {
  const canvas = canvases.get(`c/${id}`);
  if (!canvas) return notFound(view, 'Ce canvas est introuvable.');
  const m = matieres.get(canvas.matiere);
  view.classList.add('full');
  view.innerHTML = `<div class="mview">
    <header class="canvas-head">
      <nav class="crumbs">${m ? `<a href="#/m/${m.id}">${esc(m.name)}</a>${icon('chevron')}` : ''}<span>${icon('canvas')} ${esc(canvas.title)}</span></nav>
    </header>
    <div class="m-body"></div>
  </div>`;
  return mountCanvas(view.querySelector('.m-body'), canvas);
}
