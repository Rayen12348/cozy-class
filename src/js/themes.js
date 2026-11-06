import { store, emitter } from './util.js';

// Every theme maps onto Catppuccin's names so the CSS only knows one vocabulary.
const KEYS = 'rosewater flamingo pink mauve red maroon peach yellow green teal sky sapphire blue lavender text subtext1 subtext0 overlay2 overlay1 overlay0 surface2 surface1 surface0 base mantle crust'.split(' ');
const palette = (dark, list) => ({ dark, c: Object.fromEntries(KEYS.map((k, i) => [k, list.split(' ')[i]])) });

export const THEMES = {
  mocha: { label: 'Catppuccin Mocha', ...palette(true, '#f5e0dc #f2cdcd #f5c2e7 #cba6f7 #f38ba8 #eba0ac #fab387 #f9e2af #a6e3a1 #94e2d5 #89dceb #74c7ec #89b4fa #b4befe #cdd6f4 #bac2de #a6adc8 #9399b2 #7f849c #6c7086 #585b70 #45475a #313244 #1e1e2e #181825 #11111b') },
  macchiato: { label: 'Catppuccin Macchiato', ...palette(true, '#f4dbd6 #f0c6c6 #f5bde6 #c6a0f6 #ed8796 #ee99a0 #f5a97f #eed49f #a6da95 #8bd5ca #91d7e3 #7dc4e4 #8aadf4 #b7bdf8 #cad3f5 #b8c0e0 #a5adcb #939ab7 #8087a2 #6e738d #5b6078 #494d64 #363a4f #24273a #1e2030 #181926') },
  'rose-pine': { label: 'Rosé Pine', ...palette(true, '#f4dfd8 #f0cdc9 #ebbcba #c4a7e7 #eb6f92 #e88aa0 #ea9a97 #f6c177 #95c4a1 #9ccfd8 #a9d6e0 #3e8fb0 #7fa8d1 #b9b4f0 #e0def4 #c4c1dd #a8a5c3 #908caa #817c9c #6e6a86 #524f67 #403d52 #26233a #191724 #16141f #111019') },
  'tokyo-night': { label: 'Tokyo Night', ...palette(true, '#f4dbd6 #f7a8b8 #f5a3d1 #bb9af7 #f7768e #ff8fa3 #ff9e64 #e0af68 #9ece6a #73daca #7dcfff #2ac3de #7aa2f7 #b4c2f7 #c0caf5 #a9b1d6 #9aa5ce #737aa2 #6b7394 #565f89 #3b4261 #292e42 #24283b #1a1b26 #16161e #121219') },
  gruvbox: { label: 'Gruvbox', ...palette(true, '#f4c8a8 #f2a490 #d3869b #d3869b #fb4934 #ea6962 #fe8019 #fabd2f #b8bb26 #8ec07c #83a598 #83a598 #83a598 #b4a7d6 #ebdbb2 #d5c4a1 #bdae93 #a89984 #928374 #7c6f64 #665c54 #504945 #3c3836 #282828 #232323 #1d2021') },
  nord: { label: 'Nord', ...palette(true, '#e5e9f0 #d08770 #b48ead #b48ead #bf616a #c97b84 #d08770 #ebcb8b #a3be8c #8fbcbb #88c0d0 #5e81ac #81a1c1 #a3b5d9 #eceff4 #d8dee9 #c0c8d6 #7b88a1 #6e7a91 #616e88 #4c566a #434c5e #3b4252 #2e3440 #292e39 #242933') },
  everforest: { label: 'Everforest', ...palette(true, '#e6c9a8 #e69875 #d699b6 #d699b6 #e67e80 #e48b8d #e69875 #dbbc7f #a7c080 #83c092 #7fbbb3 #7fbbb3 #7fbbb3 #b5a7d6 #d3c6aa #c5bfa5 #a7b0a0 #9da9a0 #859289 #7a8478 #56635f #475258 #3d484d #2d353b #232a2e #1e2326') },
  latte: { label: 'Catppuccin Latte', ...palette(false, '#dc8a78 #dd7878 #ea76cb #8839ef #d20f39 #e64553 #fe640b #df8e1d #40a02b #179299 #04a5e5 #209fb5 #1e66f5 #7287fd #4c4f69 #5c5f77 #6c6f85 #7c7f93 #8c8fa1 #9ca0b0 #acb0be #bcc0cc #ccd0da #eff1f5 #e6e9ef #dce0e8') },
  dawn: { label: 'Rosé Pine Dawn', ...palette(false, '#c99b8a #d7827e #c27a9c #907aa9 #b4637a #c46f86 #d7827e #ea9d34 #5a8a6a #56949f #4f8fa8 #286983 #3c7ab8 #7a72b8 #575279 #625d80 #6e6a86 #797593 #8a84a0 #9893a5 #cecacd #dfdad9 #e9e0d6 #faf4ed #f2e9e1 #ebe2d9') },
};

export const ACCENTS = ['mauve', 'pink', 'flamingo', 'red', 'peach', 'yellow', 'green', 'teal', 'sky', 'blue', 'lavender'];
const PAIR = { mauve: 'blue', pink: 'mauve', flamingo: 'pink', red: 'peach', peach: 'yellow', yellow: 'green', green: 'teal', teal: 'sky', sky: 'blue', blue: 'lavender', lavender: 'pink' };

export const themeEvents = emitter();
export const current = { theme: 'mocha', accent: 'mauve' };

export function applyTheme(theme = current.theme, accent = current.accent) {
  const t = THEMES[theme] ?? THEMES.mocha;
  Object.assign(current, { theme: THEMES[theme] ? theme : 'mocha', accent });
  const vars = Object.fromEntries(KEYS.map((k) => [`--${k}`, t.c[k]]));
  vars['--accent'] = t.c[accent] ?? t.c.mauve;
  vars['--accent-2'] = t.c[PAIR[accent] ?? 'blue'];
  vars['--on-accent'] = t.dark ? t.c.crust : t.c.base;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.colorScheme = t.dark ? 'dark' : 'light';
  root.dataset.theme = current.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.c.base);
  store.set('theme', current);
  store.set('themeVars', vars);
  themeEvents.emit(current);
}

export function initTheme(defaults) {
  const saved = store.get('theme', null);
  applyTheme(saved?.theme ?? defaults.theme ?? 'mocha', saved?.accent ?? defaults.accent ?? 'mauve');
}

// Resolves a palette name ("mauve"), a JSON Canvas preset ("1"…"6") or a hex to a concrete color.
const PRESETS = { 1: 'red', 2: 'peach', 3: 'yellow', 4: 'green', 5: 'teal', 6: 'mauve' };
export function color(name, fallback = 'overlay1') {
  const c = THEMES[current.theme].c;
  if (!name) return c[fallback];
  if (name.startsWith?.('#')) return name;
  if (name === 'accent') return c[current.accent];
  return c[PRESETS[name] ?? name] ?? c[fallback];
}
