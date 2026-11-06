import { vault, itemsOf, cssColor, matiereEmoji, progress } from './data.js';
import { icon } from './icons.js';
import { esc, store, relTime } from './util.js';

let el;
let activePath = '';
const open = new Set(store.get('tree.open', []));
const closedTypes = new Set(store.get('tree.closedTypes', []));

function tree() {
  return vault.matieres.map((m) => {
    const list = itemsOf(m);
    const groups = vault.types.map((t) => [t, list.filter((i) => i.type === t.id)]).filter(([, l]) => l.length);
    const canvases = m.canvases.length > 1 ? m.canvases.slice(1) : [];
    return `<details class="tree-m" data-m="${m.id}" style="--c:${cssColor(m.color)}" ${open.has(m.id) ? 'open' : ''}>
      <summary><span class="chev">${icon('chevron')}</span><span class="tree-emoji">${matiereEmoji(m)}</span><a class="tree-m-name" href="#/m/${m.id}" data-path="/m/${m.id}">${esc(m.name)}</a><span class="tree-count">${progress.count(m.items)}/${list.length}</span></summary>
      ${canvases.map((cid) => `<a class="tree-item canvas-link" href="#/c/${cid.slice(2)}" data-path="/c/${cid.slice(2)}">${icon('canvas')} ${esc(vault.canvases.find((c) => c.id === cid)?.title ?? '')}</a>`).join('')}
      ${groups.map(([t, l]) => `<details class="tree-t" data-key="${m.id}:${t.id}" ${closedTypes.has(`${m.id}:${t.id}`) ? '' : 'open'}>
        <summary style="--tc:var(--${t.color})"><span class="chev">${icon('chevron')}</span>${esc(t.plural)}<span class="tree-count">${l.length}</span></summary>
        ${l.map((it) => `<a class="tree-item ${progress.has(it.id) ? 'done' : ''}" href="#/n/${it.id}" data-path="/n/${it.id}" title="${esc(it.title)}"><span>${esc(it.title)}</span>${it.kind === 'pdf' ? '<small>pdf</small>' : ''}</a>`).join('')}
      </details>`).join('')}
    </details>`;
  }).join('');
}

function render() {
  const scroll = el.querySelector('.side-scroll')?.scrollTop ?? 0;
  const general = vault.items.filter((i) => !i.matiere);
  el.innerHTML = `
    <div class="side-scroll">
      <nav class="side-nav">
        <a class="side-link" href="#/" data-path="/">${icon('home')}<span>accueil</span><kbd>h</kbd></a>
        <a class="side-link" href="#/graph" data-path="/graph">${icon('graph')}<span>graphe</span><kbd>g</kbd></a>
        <a class="side-link" href="#/etude" data-path="/etude">${icon('coffee')}<span>salle d'étude</span><kbd>e</kbd></a>
      </nav>
      <div class="side-title">matières</div>
      <div class="tree">${tree()}</div>
      ${general.length ? `<div class="side-title">général</div><div class="tree">${general.map((it) => `<a class="tree-item flat" href="#/n/${it.id}" data-path="/n/${it.id}"><span>${esc(it.title)}</span></a>`).join('')}</div>` : ''}
    </div>
    <div class="side-foot"><span>${icon('sparkles')} mis à jour ${relTime(vault.builtAt)}</span></div>`;
  el.querySelector('.side-scroll').scrollTop = scroll;
  setActive(activePath, false);
}

export function setActive(path, reveal = true) {
  activePath = path;
  el.querySelectorAll('.active').forEach((a) => a.classList.remove('active'));
  const link = el.querySelector(`[data-path="${CSS.escape(path)}"]`);
  if (!link) return;
  link.classList.add('active');
  if (!reveal) return;
  for (let d = link.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
  link.scrollIntoView({ block: 'nearest' });
}

export function mountSidebar(host) {
  el = host;
  if (!open.size && vault.matieres[0]) open.add(vault.matieres[0].id);
  render();
  progress.events.on(render);
  el.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.dataset.m) {
      if (d.open) open.add(d.dataset.m);
      else open.delete(d.dataset.m);
      store.set('tree.open', [...open]);
    } else if (d.dataset.key) {
      if (d.open) closedTypes.delete(d.dataset.key);
      else closedTypes.add(d.dataset.key);
      store.set('tree.closedTypes', [...closedTypes]);
    }
  }, true);
  // A link inside <summary> should navigate without folding the matière.
  el.addEventListener('click', (e) => {
    const a = e.target.closest('summary a');
    if (!a) return;
    e.preventDefault();
    location.hash = a.getAttribute('href');
  });
}
