// "Chansons": search YouTube Music and play any song right here, without
// leaving the site. Search and audio come from Metrolist Web, the small app
// that runs on your own computer (site.config.json → musicApp.url).
import { vault } from './data.js';
import { store, emitter, toast, esc } from './util.js';
import { icon } from './icons.js';

const audio = new Audio();
audio.preload = 'auto';

const base = () => (vault.site?.musicApp?.url ?? '').replace(/\/+$/, '');
const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const artists = (t) => (t?.artists ?? []).map((a) => a.name).join(', ');
// Google's image CDN refuses (429) many covers requested with a foreign Referer.
export const cover = (t, px = 120) => esc(String(t?.thumb ?? '').replace(/=w\d+-h\d+[^/]*$/, `=w${px}-h${px}-l90-rj`));

async function api(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(base() + path, { signal: ctrl.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `erreur ${res.status}`);
    return data;
  } catch (e) {
    if (e.name === 'TypeError' || e.name === 'AbortError') throw Object.assign(new Error('Metrolist Web ne répond pas'), { offline: true });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Chrome (and others) ask once before a public website may talk to apps on
// this computer ("Local network access"). Local copies of the site skip it.
const isPublic = () => !/^(localhost|127\.|\[::1\])/.test(location.hostname);
async function accessState() {
  if (!isPublic() || !navigator.permissions) return 'granted';
  for (const name of ['loopback-network', 'local-network-access', 'local-network']) {
    try {
      return (await navigator.permissions.query({ name })).state;
    } catch { /* this browser doesn't know that name */ }
  }
  return 'granted'; // no such protection in this browser
}

let searchSeq = 0;
let failures = 0;
let watchTimer = null;
let mounted = 0;

export const songs = {
  events: emitter(), // state changes (results, track, play/pause)
  tick: emitter(), // playback position (several times a second)
  enabled: () => Boolean(base()),
  query: store.get('songs.query', ''),
  results: [],
  status: 'idle', // idle | searching | offline | error
  access: 'granted', // browser permission to reach this computer: granted | prompt | denied
  error: '',
  queue: [],
  index: -1,
  continuation: null,
  active: false, // songs (not the radio) are the current music source
  loading: false,
  volume: store.get('songs.volume', 0.8),
  beforePlay: null, // set by the radio so only one plays at a time

  get current() {
    return this.queue[this.index] ?? null;
  },
  get playing() {
    return !audio.paused && !audio.ended;
  },
  get time() {
    return audio.currentTime || 0;
  },
  get duration() {
    return (Number.isFinite(audio.duration) && audio.duration) || this.current?.duration || 0;
  },
  emit() {
    this.events.emit();
  },

  async search(q) {
    q = q.trim();
    this.query = q;
    store.set('songs.query', q);
    const mine = ++searchSeq;
    if (!q) {
      this.results = [];
      this.status = 'idle';
      return this.emit();
    }
    this.status = 'searching';
    this.emit();
    try {
      const r = await api(`/api/search?q=${encodeURIComponent(q)}&filter=song`);
      if (mine !== searchSeq) return;
      this.results = r.items ?? [];
      this.status = 'idle';
    } catch (e) {
      if (mine !== searchSeq) return;
      this.status = e.offline ? 'offline' : 'error';
      this.error = e.message;
    }
    this.emit();
  },

  async checkAccess() {
    this.access = await accessState();
    this.emit();
  },

  // Pings the music server. The first time on the public site, this is what
  // makes the browser ask for permission, so it only runs after a click.
  async connect() {
    try {
      await api('/api/ping');
      if (this.status === 'offline') this.status = 'idle';
      stopWatch();
      await this.checkAccess();
      if (this.query && !this.results.length) return this.search(this.query);
    } catch (e) {
      this.status = e.offline ? 'offline' : 'error';
      this.error = e.message;
      await this.checkAccess();
    }
    this.emit();
  },

  // Play a song, then keep going with similar songs (YouTube Music radio).
  play(track) {
    this.queue = [track];
    this.index = 0;
    this.continuation = null;
    load();
    api(`/api/next?v=${track.id}`).then((r) => {
      if (this.queue[0]?.id !== track.id) return;
      const have = new Set(this.queue.map((t) => t.id));
      this.queue.push(...r.tracks.filter((t) => !have.has(t.id) && have.add(t.id)));
      this.continuation = r.continuation;
      this.emit();
    }).catch(() => {});
  },

  async playQuery(q) {
    await this.search(q);
    if (this.results[0]) this.play(this.results[0]);
    else if (this.status === 'offline') toast('Le lecteur de musique ne répond pas : ouvre le panneau chansons (touche c) pour voir quoi faire', { icon: icon('headphones') });
    else toast(`Rien trouvé pour « ${q} »`, { icon: icon('headphones') });
  },

  jump(i) {
    if (i < 0 || i >= this.queue.length) return;
    this.index = i;
    load();
  },

  async next() {
    if (this.index < this.queue.length - 1) return this.jump(this.index + 1);
    await this.more();
    if (this.index < this.queue.length - 1) this.jump(this.index + 1);
  },

  prev() {
    if (audio.currentTime > 3 || this.index <= 0) audio.currentTime = 0;
    else this.jump(this.index - 1);
  },

  async more() {
    if (!this.continuation || this.fetchingMore) return;
    this.fetchingMore = true;
    try {
      const r = await api(`/api/next?cont=${encodeURIComponent(this.continuation)}`);
      const have = new Set(this.queue.map((t) => t.id));
      this.queue.push(...r.tracks.filter((t) => !have.has(t.id) && have.add(t.id)));
      this.continuation = r.continuation;
      this.emit();
    } catch {
      // try again later
    } finally {
      this.fetchingMore = false;
    }
  },

  toggle() {
    if (!this.current) return;
    if (audio.paused) {
      this.beforePlay?.();
      this.active = true;
      audio.play().catch(() => {});
    } else audio.pause();
  },

  pause() {
    audio.pause();
  },

  seek(fraction) {
    if (Number.isFinite(audio.duration)) audio.currentTime = fraction * audio.duration;
  },

  setVolume(v) {
    this.volume = v;
    audio.volume = v;
    store.set('songs.volume', v);
  },

  close() {
    audio.pause();
    this.active = false;
    this.emit();
  },
};

// While the music server is down, check every few seconds and reconnect by itself.
function startWatch() {
  if (watchTimer) return;
  watchTimer = setInterval(() => {
    if (!mounted || songs.status !== 'offline' || songs.access !== 'granted') return stopWatch();
    songs.connect();
  }, 4000);
}
function stopWatch() {
  clearInterval(watchTimer);
  watchTimer = null;
}

function load() {
  const t = songs.current;
  if (!t) return;
  songs.beforePlay?.();
  songs.active = true;
  songs.loading = true;
  audio.src = `${base()}/api/stream/${t.id}`;
  audio.volume = songs.volume;
  audio.play().catch(() => {});
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: artists(t), album: t.album?.name ?? '', artwork: [{ src: cover(t, 512).replaceAll('&amp;', '&'), sizes: '512x512' }] });
    for (const [k, fn] of [['play', () => songs.toggle()], ['pause', () => songs.pause()], ['nexttrack', () => songs.next()], ['previoustrack', () => songs.prev()]]) {
      try {
        navigator.mediaSession.setActionHandler(k, fn);
      } catch { /* unsupported */ }
    }
  }
  if (songs.index >= songs.queue.length - 3) songs.more();
  songs.emit();
}

audio.addEventListener('playing', () => {
  songs.loading = false;
  failures = 0;
  songs.emit();
});
audio.addEventListener('waiting', () => {
  songs.loading = true;
  songs.emit();
});
audio.addEventListener('pause', () => songs.emit());
audio.addEventListener('play', () => songs.emit());
audio.addEventListener('timeupdate', () => songs.tick.emit());
audio.addEventListener('ended', () => songs.next());
audio.addEventListener('error', () => {
  const t = songs.current;
  if (!t || !audio.getAttribute('src')) return;
  songs.loading = false;
  failures++;
  songs.emit();
  toast(`Impossible de lire « ${t.title} »`, { icon: icon('headphones') });
  if (failures < 3) setTimeout(() => songs.next(), 1200);
});

// ── panel: search box, now playing, results / up next ──────────────────

const eq = '<span class="eq"><i></i><i></i><i></i><i></i></span>';

function row(t, i, kind) {
  const on = songs.current?.id === t.id;
  return `<button class="song-row ${on ? 'on' : ''}" data-${kind}="${i}">
    <span class="song-art"><img src="${cover(t)}" alt="" loading="lazy" referrerpolicy="no-referrer">${on ? `<span class="song-eq ${songs.playing ? '' : 'paused'}">${eq}</span>` : ''}</span>
    <span class="song-text"><b>${esc(t.title)}</b><small>${esc(artists(t))}</small></span>
    <span class="song-dur">${t.duration ? fmt(t.duration) : ''}</span>
  </button>`;
}

export function mountSongs(el, { autofocus = false } = {}) {
  el.classList.add('songs');
  if (!songs.enabled()) {
    el.innerHTML = '<p class="muted small">Ajoute <code>musicApp.url</code> dans site.config.json pour activer les chansons.</p>';
    return () => {};
  }
  el.innerHTML = `
    <form class="song-search" autocomplete="off">${icon('search')}<input type="search" placeholder="une chanson, un artiste…" value="${esc(songs.query)}" spellcheck="false" aria-label="Chercher une chanson"></form>
    <div class="song-now"></div>
    <div class="song-list"></div>`;
  const input = el.querySelector('input');
  const now = el.querySelector('.song-now');
  const list = el.querySelector('.song-list');
  let typing;

  input.addEventListener('input', () => {
    clearTimeout(typing);
    typing = setTimeout(() => songs.search(input.value), 400);
  });
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(typing);
    songs.search(input.value);
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.result != null) songs.play(songs.results[Number(b.dataset.result)]);
    else if (b.dataset.queue != null) songs.jump(Number(b.dataset.queue));
    else if (b.dataset.act === 'retry' || b.dataset.act === 'connect') songs.connect();
    else if (b.dataset.act) songs[b.dataset.act]();
  });
  el.addEventListener('input', (e) => {
    if (e.target.dataset.seek != null) songs.seek(Number(e.target.value) / 1000);
    if (e.target.dataset.vol != null) songs.setVolume(Number(e.target.value));
  });

  const renderNow = () => {
    const t = songs.current;
    now.hidden = !t;
    if (!t) return;
    now.innerHTML = `
      <div class="song-head">
        <img class="song-cover" src="${cover(t, 160)}" alt="" referrerpolicy="no-referrer">
        <div class="song-text"><b>${esc(t.title)}</b><small>${songs.loading && songs.active ? 'chargement…' : esc(artists(t))}</small></div>
      </div>
      <div class="song-ctrl">
        <button class="icon-btn" data-act="prev" title="Précédente">${icon('prev')}</button>
        <button class="icon-btn accent" data-act="toggle" title="Lecture / pause">${icon(songs.playing ? 'pause' : 'play')}</button>
        <button class="icon-btn" data-act="next" title="Suivante">${icon('skip')}</button>
        <span class="song-time"></span>
      </div>
      <input type="range" min="0" max="1000" value="0" data-seek aria-label="Position">
      <label class="vol-row">${icon('volume')}<input type="range" min="0" max="1" step="0.01" value="${songs.volume}" data-vol aria-label="Volume"></label>`;
    renderTime();
  };
  const renderTime = () => {
    const seek = now.querySelector('[data-seek]');
    if (!seek || document.activeElement === seek) return;
    const d = songs.duration;
    seek.value = d ? Math.round((songs.time / d) * 1000) : 0;
    now.querySelector('.song-time').textContent = `${fmt(songs.time)} / ${fmt(d)}`;
  };
  const renderList = () => {
    if (songs.status === 'searching') {
      list.innerHTML = '<p class="muted small song-msg">recherche…</p>';
    } else if (songs.access === 'prompt' && (songs.status === 'offline' || (!songs.current && !songs.results.length))) {
      list.innerHTML = `<div class="song-msg"><p class="small">Les chansons passent par le lecteur de musique de ton ordi. Ton navigateur va demander <b>une seule fois</b> si ce site peut accéder aux applis de cet appareil : clique sur <b>Autoriser</b>.</p>
        <button class="btn sm primary" data-act="connect">${icon('headphones')} activer les chansons</button></div>`;
    } else if (songs.status === 'offline' && songs.access === 'denied') {
      list.innerHTML = `<div class="song-msg"><p class="small">Ton navigateur bloque l'accès au lecteur de musique de ton ordi.</p>
        <p class="muted small">Clique sur l'icône de réglages à gauche de l'adresse du site, mets <b>Accès au réseau local</b> (ou « applis et services de cet appareil ») sur <b>Autoriser</b>, puis recharge la page.</p>
        <button class="btn sm" data-act="retry">${icon('reset')} réessayer</button></div>`;
    } else if (songs.status === 'offline') {
      startWatch();
      list.innerHTML = `<div class="song-msg"><p class="small">Le lecteur de musique de ton ordi n'est pas démarré.</p>
        <p class="muted small">Démarre-le en arrière-plan (aucune fenêtre ne s'ouvre) : <code>metrolist-web --server</code>. Le panneau se reconnecte tout seul dès qu'il tourne.</p>
        <button class="btn sm" data-act="retry">${icon('reset')} réessayer</button></div>`;
    } else if (songs.status === 'error') {
      list.innerHTML = `<div class="song-msg"><p class="small">${esc(songs.error)}</p><button class="btn sm" data-act="retry">${icon('reset')} réessayer</button></div>`;
    } else if (songs.query && songs.results.length) {
      list.innerHTML = songs.results.map((t, i) => row(t, i, 'result')).join('');
    } else if (songs.query) {
      list.innerHTML = '<p class="muted small song-msg">rien trouvé</p>';
    } else if (songs.queue.length > 1) {
      list.innerHTML = `<div class="song-label">à suivre</div>${songs.queue.map((t, i) => (i > songs.index && i <= songs.index + 8 ? row(t, i, 'queue') : '')).join('')}`;
    } else {
      list.innerHTML = '<p class="muted small song-msg">Cherche n’importe quelle chanson : elle se joue ici, et des chansons similaires suivent.</p>';
    }
  };
  const render = () => {
    renderNow();
    renderList();
  };
  render();
  if (autofocus) requestAnimationFrame(() => input.focus());
  const offA = songs.events.on(render);
  const offB = songs.tick.on(renderTime);
  mounted++;
  // Find out straight away whether music works here (without triggering the
  // browser's permission prompt, which waits for the "activer" button).
  songs.checkAccess().then(() => {
    if (songs.access === 'granted' && !songs.current) songs.connect();
  });
  return () => {
    mounted--;
    offA();
    offB();
  };
}
