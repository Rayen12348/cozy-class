import { vault } from './data.js';
import { store, emitter, toast, esc } from './util.js';
import { icon } from './icons.js';
import { ambience, SOUNDS } from './audio.js';
import { songs, cover, artists } from './songs.js';

let audioEl = null;
let yt = null;
let ytVideo = null;
let ytApi = null;

function loadYouTube() {
  return (ytApi ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      ytApi = null;
      reject(new Error('YouTube inaccessible'));
    };
    document.head.append(s);
  }));
}

export const radio = {
  events: emitter(),
  index: store.get('radio.index', 0),
  volume: store.get('radio.volume', 0.6),
  playing: false,
  loading: false,
  started: false,

  get stations() {
    return vault.site?.stations ?? [];
  },
  get station() {
    return this.stations[this.index];
  },
  emit() {
    this.events.emit();
  },

  async play(index = this.index) {
    if (!this.stations.length) return;
    songs.pause();
    songs.active = false;
    this.index = ((index % this.stations.length) + this.stations.length) % this.stations.length;
    store.set('radio.index', this.index);
    const st = this.station;
    this.started = true;
    this.loading = true;
    this.emit();
    try {
      if (st.type === 'youtube') {
        audioEl?.pause();
        await this.playYouTube(st.id);
      } else {
        yt?.pauseVideo();
        audioEl ??= this.createAudio();
        audioEl.src = st.url; // reload: live streams resume at "now"
        audioEl.volume = this.volume;
        await audioEl.play();
      }
    } catch (e) {
      this.loading = false;
      this.playing = false;
      toast(`Impossible de lire « ${st.name} » (${e.message || 'erreur réseau'})`, { icon: icon('radio') });
      this.emit();
    }
  },

  async playYouTube(id) {
    const YT = await loadYouTube();
    if (!yt) {
      yt = await new Promise((resolve, reject) => {
        const player = new YT.Player('yt-player', {
          videoId: id,
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3 },
          events: {
            onReady: () => resolve(player),
            onError: (e) => {
              reject(new Error(`YouTube ${e.data}`));
              toast(`« ${this.station.name} » est indisponible sur YouTube — essaie une autre station`, { icon: icon('radio') });
              this.loading = false;
              this.playing = false;
              this.emit();
            },
            onStateChange: (e) => {
              this.playing = e.data === YT.PlayerState.PLAYING;
              this.loading = e.data === YT.PlayerState.BUFFERING;
              this.emit();
            },
          },
        });
      });
      ytVideo = id;
      yt.setVolume(this.volume * 100);
      yt.playVideo();
    } else if (ytVideo !== id) {
      ytVideo = id;
      yt.loadVideoById(id);
    } else yt.playVideo();
  },

  createAudio() {
    const a = new Audio();
    a.preload = 'none';
    const on = (type, state) => a.addEventListener(type, () => {
      Object.assign(this, state);
      this.emit();
    });
    on('playing', { playing: true, loading: false });
    on('waiting', { loading: true });
    on('pause', { playing: false, loading: false });
    return a;
  },

  pause() {
    if (this.station?.type === 'youtube') yt?.pauseVideo();
    else audioEl?.pause();
    this.playing = false;
    this.loading = false;
    this.emit();
  },
  toggle() {
    if (this.playing || this.loading) this.pause();
    else this.play();
  },
  next() {
    this.play(this.index + 1);
  },
  prev() {
    this.play(this.index - 1);
  },
  close() {
    this.pause();
    this.started = false;
    this.emit();
  },
  setVolume(v) {
    this.volume = v;
    store.set('radio.volume', v);
    if (audioEl) audioEl.volume = v;
    yt?.setVolume?.(v * 100);
    this.emit();
  },
};

// Only one music source at a time: starting a song pauses the radio.
songs.beforePlay = () => {
  if (radio.playing || radio.loading) radio.pause();
};

const eq = () => '<span class="eq"><i></i><i></i><i></i><i></i></span>';

// ── Floating mini player (keeps the YouTube iframe alive across pages) ──
// It shows the radio, or the song playing from the "chansons" panel.
export function mountDock(el) {
  el.className = 'dock window';
  el.hidden = true;
  el.innerHTML = `
    <div class="dock-video"><div id="yt-player"></div></div>
    <div class="dock-body">
      ${eq()}
      <img class="dock-art" alt="" referrerpolicy="no-referrer" hidden>
      <div class="dock-info" data-act="open"><div class="dock-title"></div><div class="dock-sub"></div></div>
      <button class="icon-btn" data-act="prev" title="Précédent">${icon('prev')}</button>
      <button class="icon-btn accent" data-act="toggle"></button>
      <button class="icon-btn" data-act="next" title="Suivant">${icon('skip')}</button>
      <button class="icon-btn" data-act="min" title="Réduire">${icon('minimize')}</button>
      <button class="icon-btn" data-act="close" title="Fermer">${icon('x')}</button>
    </div>
    <div class="dock-progress"><i></i></div>`;
  if (store.get('dock.min', false)) el.classList.add('min');
  const art = el.querySelector('.dock-art');
  const bar = el.querySelector('.dock-progress i');
  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'min') {
      el.classList.toggle('min');
      store.set('dock.min', el.classList.contains('min'));
      update();
    } else if (songs.active && songs.current) {
      if (act === 'open') document.querySelector('#bar .songs-btn')?.click();
      else songs[act]?.();
    } else if (act !== 'open') radio[act]();
  });
  const update = () => {
    const song = songs.active ? songs.current : null;
    el.hidden = !song && !radio.started;
    el.classList.toggle('song', !!song);
    art.hidden = !song;
    el.querySelector('[data-act="min"]').innerHTML = icon(el.classList.contains('min') ? 'maximize' : 'minimize');
    if (song) {
      el.classList.remove('yt');
      el.classList.toggle('playing', songs.playing);
      if (art.dataset.id !== song.id) {
        art.dataset.id = song.id;
        art.src = cover(song).replaceAll('&amp;', '&');
      }
      el.querySelector('.dock-title').textContent = song.title;
      el.querySelector('.dock-sub').textContent = songs.loading ? 'chargement…' : artists(song);
      el.querySelector('[data-act="toggle"]').innerHTML = icon(songs.playing ? 'pause' : 'play');
      return;
    }
    const st = radio.station;
    if (!st) return;
    el.classList.toggle('yt', st.type === 'youtube');
    el.classList.toggle('playing', radio.playing);
    el.querySelector('.dock-title').textContent = st.name;
    el.querySelector('.dock-sub').textContent = radio.loading ? 'chargement…' : st.by ?? '';
    el.querySelector('[data-act="toggle"]').innerHTML = icon(radio.playing || radio.loading ? 'pause' : 'play');
  };
  update();
  radio.events.on(update);
  songs.events.on(update);
  songs.tick.on(() => {
    bar.style.width = songs.duration ? `${(songs.time / songs.duration) * 100}%` : '0';
  });
}

export function mountMusicPill(el) {
  const update = () => {
    const active = SOUNDS.filter((s) => ambience.isOn(s.id));
    const song = songs.active && songs.playing ? songs.current : null;
    const on = radio.playing || !!song;
    el.classList.toggle('playing', on);
    el.innerHTML = `${on ? eq() : icon('music')}<span class="music-name hide-sm">${song ? esc(song.title) : radio.playing ? esc(radio.station.name) : 'musique'}</span>${active.map((s) => `<span class="amb-dot" style="--c:var(--${s.color})">${icon(s.icon)}</span>`).join('')}`;
  };
  update();
  const a = radio.events.on(update);
  const b = ambience.events.on(update);
  const c = songs.events.on(update);
  return () => (a(), b(), c());
}

export function mountRadio(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.station != null) {
      const i = Number(b.dataset.station);
      if (i === radio.index && (radio.playing || radio.loading)) radio.pause();
      else radio.play(i);
    } else if (b.dataset.act) radio[b.dataset.act]();
  });
  el.addEventListener('input', (e) => {
    if (e.target.dataset.vol != null) radio.setVolume(Number(e.target.value));
  });
  const render = () => {
    el.innerHTML = `
      <div class="stations">${radio.stations.map((s, i) => {
        const on = i === radio.index && (radio.playing || radio.loading);
        return `<button class="station ${on ? 'on' : ''}" data-station="${i}">
          <span class="station-icon">${on ? (radio.loading ? icon('radio') : eq()) : icon(s.type === 'youtube' ? 'play' : 'radio')}</span>
          <span class="station-name">${esc(s.name)}<small>${esc(s.by ?? '')}${s.type === 'youtube' ? ' · YouTube' : ' · radio'}</small></span>
        </button>`;
      }).join('') || '<p class="muted">Aucune station dans site.config.json</p>'}</div>
      <label class="vol-row">${icon('volume')}<input type="range" min="0" max="1" step="0.01" value="${radio.volume}" data-vol></label>`;
  };
  render();
  return radio.events.on(() => {
    // Don't rebuild while the user drags the slider.
    if (!el.contains(document.activeElement) || document.activeElement.type !== 'range') render();
  });
}

export function mountMixer(el) {
  el.innerHTML = SOUNDS.map((s) => `
    <div class="mixer-row" data-id="${s.id}" style="--c:var(--${s.color})">
      <button class="mixer-btn" data-toggle="${s.id}" title="${esc(s.label)}">${icon(s.icon)}</button>
      <div class="mixer-main"><span>${esc(s.label)}</span><input type="range" min="0" max="1" step="0.01" value="${ambience.volumes[s.id]}" data-sound="${s.id}"></div>
    </div>`).join('') + '<button class="btn sm ghost mixer-off" data-off>tout couper</button>';
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b?.dataset.toggle) ambience.toggle(b.dataset.toggle);
    if (b?.hasAttribute('data-off')) ambience.stopAll();
  });
  el.addEventListener('input', (e) => {
    if (e.target.dataset.sound) ambience.setVolume(e.target.dataset.sound, Number(e.target.value));
  });
  const update = () => {
    el.querySelectorAll('.mixer-row').forEach((row) => row.classList.toggle('on', ambience.isOn(row.dataset.id)));
    el.querySelector('[data-off]').hidden = !ambience.any();
  };
  update();
  return ambience.events.on(update);
}
