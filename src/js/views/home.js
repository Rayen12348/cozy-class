import { vault, items, itemsOf, typeOf, matieres, cssColor, matiereEmoji, badge, progress, recent } from '../data.js';
import { THEMES, current } from '../themes.js';
import { stats } from '../pomodoro.js';
import { icon } from '../icons.js';
import { esc, store, relTime } from '../util.js';
import { enhance } from '../enhance.js';

const ASCII = String.raw`
     ( (
      ) )
   .........
   |       |]
   \       /
    '-----'`.slice(1);

export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
};

export function matiereCard(m) {
  const list = itemsOf(m);
  const done = progress.count(m.items);
  const counts = vault.types.map((t) => [t, list.filter((i) => i.type === t.id).length]).filter(([, n]) => n);
  return `<a class="m-card" href="#/m/${m.id}" style="--c:${cssColor(m.color)}">
    ${m.index < 9 ? `<span class="m-num">alt ${m.index + 1}</span>` : ''}
    <span class="m-icon">${matiereEmoji(m)}</span>
    <h3>${esc(m.name)}</h3>
    <p>${esc(m.description || `${list.length} documents`)}</p>
    <div class="m-counts">${counts.map(([t, n]) => `<span class="badge t-${t.id}">${n} ${esc(n > 1 ? t.plural : t.label)}</span>`).join('')}</div>
    <div class="progress"><span style="width:${list.length ? (done / list.length) * 100 : 0}%"></span></div>
    <small class="muted">${done}/${list.length} vus</small>
  </a>`;
}

export const itemRow = (it) => {
  const m = matieres.get(it.matiere);
  return `<a class="row" href="#/n/${it.id}" style="--c:var(--${typeOf(it).color})">
    <span class="row-icon">${icon(typeOf(it).icon)}</span>
    <span class="row-main"><span class="row-title">${esc(it.title)}</span><span class="row-sub">${m ? esc(m.name) : 'Général'}</span></span>
    ${badge(it)}
    ${progress.has(it.id) ? `<span class="row-done">${icon('tick')}</span>` : ''}
  </a>`;
};

export function renderHome(view) {
  const name = store.get('name', '');
  const day = stats.day();
  const total = vault.items.length;
  const done = progress.count(vault.items.map((i) => i.id));
  const notes = vault.items.filter((i) => i.kind === 'note').length;
  const history = recent.list().slice(0, 6).map((id) => items.get(id));
  const latest = [...vault.items].sort((a, b) => (b.date ?? b.updated).localeCompare(a.date ?? a.updated)).slice(0, 6);
  const user = (name || 'étudiant').toLowerCase().replace(/\s+/g, '');
  const host = vault.site.title.replace(/[^\p{L}\p{N}]+/gu, '');

  view.innerHTML = `<div class="page home">
    <header class="home-head">
      <h1 class="hello">${greeting()}, <span class="name" contenteditable="plaintext-only" spellcheck="false" title="Clique pour changer ton prénom">${esc(name || 'toi')}</span></h1>
      <p class="muted lead">${esc(vault.site.description ?? '')}</p>
    </header>

    <section class="card fetch">
      <pre class="ascii" aria-hidden="true">${esc(ASCII)}</pre>
      <div class="fetch-info">
        <div class="fetch-user"><b>${esc(user)}</b>@<b>${esc(host)}</b></div>
        <div class="fetch-rule"></div>
        <dl>
          ${vault.site.classe ? `<dt>classe</dt><dd>${esc(vault.site.classe)}</dd>` : ''}
          <dt>matières</dt><dd>${vault.matieres.length}</dd>
          <dt>contenu</dt><dd>${notes} notes · ${total - notes} documents</dd>
          <dt>progression</dt><dd>${done}/${total} vus${total ? ` (${Math.round((done / total) * 100)}%)` : ''}</dd>
          <dt>pomodoros</dt><dd>${day.count ? `${day.count} pomodoro${day.count > 1 ? 's' : ''} · ${day.minutes} min aujourd'hui` : "aucun aujourd'hui — on s'y met ?"}</dd>
          <dt>thème</dt><dd>${esc(THEMES[current.theme].label)}</dd>
          <dt>mis à jour</dt><dd>${relTime(vault.builtAt)}</dd>
        </dl>
        <div class="swatches">${['red', 'peach', 'yellow', 'green', 'teal', 'blue', 'mauve', 'pink'].map((c) => `<span style="background:var(--${c})"></span>`).join('')}</div>
      </div>
      <div class="fetch-actions">
        <a class="btn primary" href="#/etude">${icon('coffee')} salle d'étude</a>
        <a class="btn" href="#/graph">${icon('graph')} graphe</a>
        <button class="btn" data-launch>${icon('search')} chercher <span class="kbd">/</span></button>
      </div>
    </section>

    ${vault.home?.html ? `<section class="card prose home-note">${vault.home.html}</section>` : ''}

    <h2 class="section-h"><span class="prompt">❯</span> matières</h2>
    <div class="m-grid">${vault.matieres.map(matiereCard).join('') || '<p class="empty">Ajoute un dossier par matière dans <code>content/</code>.</p>'}</div>

    <div class="home-cols">
      <section>
        <h2 class="section-h"><span class="prompt">❯</span> reprendre</h2>
        <div class="rows">${history.map(itemRow).join('') || '<p class="empty small">Les notes que tu ouvres apparaîtront ici.</p>'}</div>
      </section>
      <section>
        <h2 class="section-h"><span class="prompt">❯</span> nouveautés</h2>
        <div class="rows">${latest.map(itemRow).join('')}</div>
      </section>
    </div>
  </div>`;

  enhance(view.querySelector('.home-note') ?? view, { depth: 1 });
  const nameEl = view.querySelector('.name');
  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameEl.blur();
    }
  });
  nameEl.addEventListener('blur', () => {
    const value = nameEl.textContent.trim().slice(0, 30);
    store.set('name', value);
    nameEl.textContent = value || 'toi';
    view.querySelector('.fetch-user b').textContent = (value || 'étudiant').toLowerCase().replace(/\s+/g, '');
  });
}
