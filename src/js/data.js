import { store, emitter } from './util.js';
import { icon } from './icons.js';

export const vault = {};
export const items = new Map();
export const matieres = new Map();
export const types = new Map();
export const canvases = new Map();

export async function loadVault() {
  const res = await fetch('data/vault.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`data/vault.json → HTTP ${res.status}`);
  Object.assign(vault, await res.json());
  vault.types.forEach((t) => types.set(t.id, t));
  vault.matieres.forEach((m, i) => {
    m.index = i;
    matieres.set(m.id, m);
  });
  vault.items.forEach((i) => items.set(i.id, i));
  vault.canvases.forEach((c) => canvases.set(c.id, c));
}

export const cssColor = (c) => (!c ? 'var(--accent)' : c.startsWith('#') ? c : `var(--${c})`);
export const typeOf = (item) => types.get(item.type) ?? types.get('autre');
export const matiereOf = (item) => matieres.get(item.matiere);
export const itemsOf = (m) => m.items.map((id) => items.get(id));

export function itemIcon(item) {
  if (item.kind === 'image') return icon('image');
  return icon(typeOf(item).icon);
}

export const badge = (item) => `<span class="badge t-${item.type}">${typeOf(item).label}${item.kind === 'pdf' ? ' · PDF' : ''}</span>`;
export const matiereEmoji = (m) => m.icon ?? m.name.charAt(0).toUpperCase();

const htmlCache = new Map();
export function noteHtml(id) {
  if (!htmlCache.has(id)) {
    htmlCache.set(id, fetch(`data/html/${id}.html`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }));
  }
  return htmlCache.get(id);
}

let searchIndex;
export const loadSearch = () => (searchIndex ??= fetch('data/search.json').then((r) => r.json()).then((list) => new Map(list.map((e) => [e.id, e.text]))));

// Per-student progress, kept in this browser only.
export const progress = {
  done: new Set(store.get('done', [])),
  events: emitter(),
  has(id) {
    return this.done.has(id);
  },
  toggle(id) {
    if (this.done.has(id)) this.done.delete(id);
    else this.done.add(id);
    store.set('done', [...this.done]);
    this.events.emit(id);
  },
  count(ids) {
    return ids.filter((id) => this.done.has(id)).length;
  },
};

export const recent = {
  list: () => store.get('history', []).filter((id) => items.has(id)),
  push(id) {
    store.set('history', [id, ...store.get('history', []).filter((x) => x !== id)].slice(0, 12));
  },
};
