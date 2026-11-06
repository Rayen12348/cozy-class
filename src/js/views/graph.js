import { vault, cssColor, matiereEmoji } from '../data.js';
import { ForceGraph, graphData } from '../graph.js';
import { icon } from '../icons.js';
import { esc, go, store, isMobile } from '../util.js';

export function renderGraph(view, { query }) {
  view.classList.add('full');
  const data = graphData();
  const hiddenM = new Set(store.get('graph.hiddenM', []));
  const hiddenT = new Set(store.get('graph.hiddenT', []));
  let hubs = store.get('graph.hubs', true);
  let colorBy = store.get('graph.color', 'matiere');
  const collapsed = store.get('graph.panel', isMobile());

  view.innerHTML = `<div class="graph-wrap">
    <canvas class="graph-canvas"></canvas>
    <aside class="graph-panel ${collapsed ? 'collapsed' : ''}">
      <button class="graph-panel-head" data-collapse>${icon('graph')} graphe <span class="muted small">${vault.items.length} notes</span>${icon('chevron', 'chev')}</button>
      <div class="graph-panel-body">
        <input class="field" type="search" placeholder="surligner…" data-search>
        <div class="panel-sub">matières</div>
        <div class="chips wrap">${vault.matieres.map((m) => `<button class="chip ${hiddenM.has(m.id) ? '' : 'on'}" data-m="${m.id}" style="--c:${cssColor(m.color)}">${matiereEmoji(m)} ${esc(m.name)}</button>`).join('')}</div>
        <div class="panel-sub">types</div>
        <div class="chips wrap">${vault.types.map((t) => `<button class="chip ${hiddenT.has(t.id) ? '' : 'on'}" data-t="${t.id}" style="--c:var(--${t.color})">${esc(t.label)}</button>`).join('')}</div>
        <div class="panel-sub">couleur par</div>
        <div class="chips seg"><button class="chip" data-color="matiere">matière</button><button class="chip" data-color="type">type</button></div>
        <label class="switch"><input type="checkbox" data-hubs ${hubs ? 'checked' : ''}><span>nœuds matière</span></label>
      </div>
    </aside>
    <div class="jc-controls">
      <button class="icon-btn" data-z="in" title="Zoomer">${icon('plus')}</button>
      <button class="icon-btn" data-z="out" title="Dézoomer">${icon('minus')}</button>
      <button class="icon-btn" data-z="fit" title="Tout voir">${icon('fit')}</button>
    </div>
    <div class="jc-hint hide-sm">survol : voisins · glisser un nœud : le déplacer · clic : ouvrir</div>
  </div>`;

  const focus = query.get('focus');
  const panel = view.querySelector('.graph-panel');
  const graph = new ForceGraph(view.querySelector('canvas'), {
    ...data,
    focus,
    insetLeft: () => (isMobile() || panel.classList.contains('collapsed') ? 0 : panel.offsetWidth + 14),
    onOpen: (n) => go(n.kind === 'matiere' ? `#/m/${n.matiere}` : `#/n/${n.id}`),
  });

  const apply = () => {
    graph.setFilter((n) => (n.kind === 'matiere' ? hubs && !hiddenM.has(n.matiere) : !hiddenT.has(n.type) && !hiddenM.has(n.matiere)));
    graph.setColorBy(colorBy);
    view.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('on', b.dataset.color === colorBy));
    store.set('graph.hiddenM', [...hiddenM]);
    store.set('graph.hiddenT', [...hiddenT]);
    store.set('graph.hubs', hubs);
    store.set('graph.color', colorBy);
  };
  apply();

  view.querySelector('.graph-wrap').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const toggle = (set, key) => {
      if (set.has(key)) set.delete(key);
      else set.add(key);
      b.classList.toggle('on', !set.has(key));
    };
    if (b.dataset.m) toggle(hiddenM, b.dataset.m);
    else if (b.dataset.t) toggle(hiddenT, b.dataset.t);
    else if (b.dataset.color) colorBy = b.dataset.color;
    else if (b.hasAttribute('data-collapse')) {
      panel.classList.toggle('collapsed');
      store.set('graph.panel', panel.classList.contains('collapsed'));
      graph.refit();
      return;
    } else if (b.dataset.z) {
      if (b.dataset.z === 'in') graph.zoomBy(1.25);
      if (b.dataset.z === 'out') graph.zoomBy(0.8);
      if (b.dataset.z === 'fit') graph.refit();
      return;
    } else return;
    apply();
  });
  view.querySelector('[data-hubs]').addEventListener('change', (e) => {
    hubs = e.target.checked;
    apply();
  });
  view.querySelector('[data-search]').addEventListener('input', (e) => graph.setHighlight(e.target.value));

  return () => graph.destroy();
}
