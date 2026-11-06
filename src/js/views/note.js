import { items, matieres, itemsOf, typeOf, cssColor, matiereEmoji, badge, noteHtml, progress, recent } from '../data.js';
import { ForceGraph, localGraph } from '../graph.js';
import { icon } from '../icons.js';
import { esc, fmtDate, fmtSize, go } from '../util.js';
import { enhance } from '../enhance.js';
import { notFound } from './notfound.js';

const linkList = (ids) => ids
  .map((id) => (id.startsWith('m:') ? null : items.get(id)))
  .filter(Boolean)
  .map((it) => `<a class="side-ref" href="#/n/${it.id}" style="--c:var(--${typeOf(it).color})">${icon(typeOf(it).icon)}<span>${esc(it.title)}</span></a>`)
  .join('');

export async function renderNote(view, { params: [id], query, alive }) {
  const it = items.get(id);
  if (!it) return notFound(view, 'Cette note est introuvable — elle a peut-être été renommée.');
  recent.push(id);
  const m = matieres.get(it.matiere);
  const t = typeOf(it);
  const siblings = m ? itemsOf(m).filter((x) => x.type === it.type) : [];
  const idx = siblings.indexOf(it);
  const [prev, next] = [siblings[idx - 1], siblings[idx + 1]];
  const corrections = it.corrections.map((c) => items.get(c)).filter(Boolean);
  const enonce = it.enonce && items.get(it.enonce);
  const minutes = Math.max(1, Math.round(it.words / 200));
  const outgoing = it.links.filter((l) => !l.startsWith('m:'));

  view.innerHTML = `
  <div class="read-progress"></div>
  <div class="note ${it.kind !== 'note' ? 'is-file' : ''}" style="--c:${m ? cssColor(m.color) : 'var(--accent)'}">
    <article class="note-main">
      <nav class="crumbs">
        ${m ? `<a href="#/m/${m.id}">${matiereEmoji(m)} ${esc(m.name)}</a>${icon('chevron')}<a href="#/m/${m.id}?tab=liste">${esc(t.plural)}</a>` : '<a href="#/">général</a>'}
      </nav>
      <h1 class="note-title">${esc(it.title)}</h1>
      <div class="note-meta">
        ${badge(it)}
        ${it.date ? `<span>${icon('clock')} ${fmtDate(it.date)}</span>` : ''}
        ${it.kind === 'note' ? `<span>${minutes} min de lecture</span>` : it.size ? `<span>${it.ext.toUpperCase()} · ${fmtSize(it.size)}</span>` : ''}
        ${it.tags.map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('')}
      </div>
      <div class="note-actions">
        <button class="btn sm done-btn"></button>
        ${corrections.map((c) => `<a class="btn sm accent-btn" href="#/n/${c.id}" style="--c:var(--teal)">${icon('check')} voir la correction</a>`).join('')}
        ${enonce ? `<a class="btn sm" href="#/n/${enonce.id}">${icon('left')} énoncé : ${esc(enonce.title)}</a>` : ''}
        ${it.url ? `<a class="btn sm" href="${it.url}" target="_blank" rel="noopener">${icon('external')} ouvrir</a><a class="btn sm" href="${it.url}" download>${icon('download')} télécharger</a>` : ''}
      </div>
      <div class="prose" id="prose"><div class="skeleton"></div><div class="skeleton short"></div><div class="skeleton"></div></div>
      <nav class="note-nav">
        ${prev ? `<a class="card nav-prev" href="#/n/${prev.id}"><small>${icon('left')} précédent</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}
        ${next ? `<a class="card nav-next" href="#/n/${next.id}"><small>suivant ${icon('right')}</small><span>${esc(next.title)}</span></a>` : ''}
      </nav>
    </article>
    <aside class="note-aside">
      <section class="toc-wrap" hidden><div class="panel-title">${icon('list')} sommaire</div><nav class="toc"></nav></section>
      <section><div class="panel-title">${icon('graph')} graphe local <a class="panel-link" href="#/graph?focus=${encodeURIComponent(id)}">agrandir</a></div><div class="mini-graph"><canvas></canvas></div></section>
      ${it.backlinks.length ? `<section><div class="panel-title">${icon('link')} mentionné dans</div>${linkList(it.backlinks)}</section>` : ''}
      ${outgoing.length ? `<section><div class="panel-title">${icon('right')} liens</div>${linkList(outgoing)}</section>` : ''}
    </aside>
  </div>`;

  const doneBtn = view.querySelector('.done-btn');
  const paintDone = () => {
    const done = progress.has(id);
    doneBtn.classList.toggle('on', done);
    doneBtn.innerHTML = `${icon(done ? 'check' : 'tick')} ${done ? 'vu ✓' : 'marquer comme vu'}`;
  };
  paintDone();
  doneBtn.addEventListener('click', () => progress.toggle(id));
  const offProgress = progress.events.on(paintDone);

  const graph = new ForceGraph(view.querySelector('.mini-graph canvas'), { ...localGraph(id), focus: id, compact: true, onOpen: (n) => go(n.kind === 'matiere' ? `#/m/${n.matiere}` : `#/n/${n.id}`) });

  const bar = view.querySelector('.read-progress');
  const onScroll = () => {
    const max = view.scrollHeight - view.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? view.scrollTop / max : 0})`;
  };
  view.addEventListener('scroll', onScroll, { passive: true });

  let spy = null;
  const cleanup = () => {
    graph.destroy();
    offProgress();
    spy?.disconnect();
    view.removeEventListener('scroll', onScroll);
  };

  const prose = view.querySelector('#prose');
  if (it.kind === 'pdf') {
    prose.className = 'file-view';
    prose.innerHTML = `<iframe class="pdf-frame" src="${it.url}" title="${esc(it.title)}"></iframe>
      <p class="muted small mobile-only">Le PDF ne s'affiche pas ? <a href="${it.url}" target="_blank" rel="noopener">Ouvre-le dans un nouvel onglet</a>.</p>`;
    return cleanup;
  }
  if (it.kind === 'image') {
    prose.className = 'file-view';
    prose.innerHTML = `<img class="image-view" src="${it.url}" alt="${esc(it.title)}">`;
    return cleanup;
  }
  if (it.kind === 'file') {
    prose.className = 'file-view';
    prose.innerHTML = `<a class="card file-card" href="${it.url}" download>${icon('download')}<span><b>${esc(it.name ?? it.title)}.${esc(it.ext)}</b><small>${fmtSize(it.size)} · clique pour télécharger</small></span></a>`;
    return cleanup;
  }

  let html;
  try {
    html = await noteHtml(id);
  } catch {
    html = '<p class="muted">Impossible de charger cette note.</p>';
  }
  if (!alive()) return cleanup;
  prose.innerHTML = html;

  // A leading "# Title" in the note becomes the page title.
  const first = prose.firstElementChild;
  if (first?.tagName === 'H1') {
    view.querySelector('.note-title').innerHTML = first.innerHTML;
    first.remove();
  }
  enhance(prose, { id });

  const headings = [...prose.querySelectorAll(':scope > h1, :scope > h2, :scope > h3')];
  if (headings.length > 1) {
    const toc = view.querySelector('.toc');
    view.querySelector('.toc-wrap').hidden = false;
    toc.innerHTML = headings.map((h) => `<a href="#/n/${id}?h=${h.id}" data-h="${h.id}" class="d${h.tagName[1]}">${esc(h.textContent)}</a>`).join('');
    spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        toc.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.h === e.target.id));
      }
    }, { root: view, rootMargin: '0px 0px -70% 0px' });
    headings.forEach((h) => spy.observe(h));
  }

  view.scrollToHeading = (h) => {
    const target = h && prose.querySelector(`#${CSS.escape(h)}`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 1500);
  };
  if (query.get('h')) requestAnimationFrame(() => view.scrollToHeading(query.get('h')));
  return cleanup;
}
