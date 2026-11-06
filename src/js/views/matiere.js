import { vault, matieres, canvases, itemsOf, items, typeOf, cssColor, matiereEmoji, badge, progress } from '../data.js';
import { stats } from '../pomodoro.js';
import { mountCanvas } from '../jcanvas.js';
import { icon } from '../icons.js';
import { esc, store, fmtDate } from '../util.js';
import { enhance } from '../enhance.js';
import { notFound } from './notfound.js';

export function docCard(it) {
  const corr = it.corrections.map((id) => items.get(id)).filter(Boolean);
  return `<article class="doc ${progress.has(it.id) ? 'done' : ''}" style="--c:var(--${typeOf(it).color})">
    <a class="doc-link" href="#/n/${it.id}">
      <div class="doc-head">${badge(it)}${it.date ? `<span class="muted small">${fmtDate(it.date)}</span>` : ''}</div>
      <h3>${esc(it.title)}</h3>
      <p>${esc(it.excerpt || (it.kind === 'pdf' ? 'Document PDF' : ''))}</p>
    </a>
    <div class="doc-foot">
      <button class="doc-check" data-done="${it.id}" title="Marquer comme vu">${icon('tick')}<span>${progress.has(it.id) ? 'vu' : 'à voir'}</span></button>
      ${corr.map((c) => `<a class="doc-corr" href="#/n/${c.id}">${icon('check')} correction</a>`).join('')}
    </div>
  </article>`;
}

export function renderMatiere(view, { params: [id], query }) {
  const m = matieres.get(id);
  if (!m) return notFound(view, 'Cette matière n’existe pas (ou plus).');
  const list = itemsOf(m);
  const tabs = [
    ...m.canvases.map((cid) => ({ id: cid, label: canvases.get(cid).auto ? 'carte' : canvases.get(cid).title, icon: 'canvas' })),
    { id: 'liste', label: 'liste', icon: 'list' },
  ];
  let tab = query.get('tab') ?? store.get(`tab.${m.id}`, tabs[0].id);
  if (!tabs.some((t) => t.id === tab)) tab = tabs[0].id;
  store.set(`tab.${m.id}`, tab);

  const done = progress.count(m.items);
  const pomos = stats.forMatiere(m.id);
  view.classList.add('full');
  view.innerHTML = `<div class="mview" style="--c:${cssColor(m.color)}">
    <header class="m-head">
      <span class="m-icon big">${matiereEmoji(m)}</span>
      <div class="m-head-main">
        <h1>${esc(m.name)}</h1>
        <p class="muted">${esc(m.description)}${m.prof ? ` · ${esc(m.prof)}` : ''}</p>
      </div>
      <div class="m-head-side">
        <div class="m-progress"><div class="progress"><span style="width:${list.length ? (done / list.length) * 100 : 0}%"></span></div><small>${done}/${list.length} vus${pomos ? ` · ${pomos} pomodoro${pomos > 1 ? 's' : ''}` : ''}</small></div>
      </div>
    </header>
    <nav class="tabs" role="tablist">${tabs.map((t) => `<a class="tab ${t.id === tab ? 'active' : ''}" role="tab" href="#/m/${m.id}?tab=${encodeURIComponent(t.id)}">${icon(t.icon)} ${esc(t.label)}</a>`).join('')}</nav>
    <div class="m-body"></div>
  </div>`;
  const body = view.querySelector('.m-body');

  if (tab !== 'liste') return mountCanvas(body, canvases.get(tab));

  body.classList.add('m-scroll');
  body.innerHTML = `<div class="page">
    ${m.html ? `<div class="card prose intro">${m.html}</div>` : ''}
    ${vault.types.map((t) => {
      const docs = list.filter((i) => i.type === t.id);
      if (!docs.length) return '';
      return `<section><h2 class="section-h"><span class="prompt">❯</span> ${esc(t.plural.toLowerCase())} <span class="count">${docs.length}</span></h2>
        <div class="doc-grid">${docs.map(docCard).join('')}</div></section>`;
    }).join('') || '<p class="empty">Rien ici pour le moment.</p>'}
  </div>`;
  enhance(body, { depth: 1 });
  const onClick = (e) => {
    const b = e.target.closest('[data-done]');
    if (!b) return;
    progress.toggle(b.dataset.done);
    const card = b.closest('.doc');
    card.classList.toggle('done', progress.has(b.dataset.done));
    b.querySelector('span').textContent = progress.has(b.dataset.done) ? 'vu' : 'à voir';
  };
  body.addEventListener('click', onClick);
}
