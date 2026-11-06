# cozy·class

A cozy study site for the class: every matière with its cours, TD, TP, corrections and résumés. It works like Obsidian (graph view, canvas boards, wikilinks) and has a study room with a pomodoro timer, lofi radio and ambient sounds. The look borrows from riced Linux desktops (rofi/waybar style, Catppuccin and friends).

**The `content/` folder is an Obsidian vault.** You write notes and drop PDFs in Obsidian, then rebuild, and the site shows them.

## Quick start

```sh
npm install
npm run dev            # → http://localhost:5173, rebuilds + reloads when you save
npm run dev -- --host  # same, also reachable from phones on your Wi-Fi
npm run build          # static site in dist/
```

## Adding content

Open `content/` as a vault in Obsidian (*Open folder as vault*).

```
content/
├── Accueil.md                  ← message on the home page (optional)
├── _templates/                 ← Obsidian templates (ignored by the site)
├── _assets/                    ← images/attachments only used through embeds
└── Analyse/                    ← one folder = one matière
    ├── Analyse.md              ← matière card: icon, color, prof, description
    ├── Analyse.canvas          ← optional custom board (becomes a tab)
    ├── Cours/Chapitre 1 - Suites.md
    ├── TD/TD 1 - Suites.md
    ├── TP/TP 1.pdf             ← PDFs, images, .zip, .py… are documents too
    ├── Corrections/Correction TD 1.md
    ├── Résumés/Fiche.md
    └── Examens/Examen 2025.pdf
```

The **type** comes from the sub-folder name (accents and plurals don't matter):

| Type | Folder names recognised |
|---|---|
| Cours | `Cours`, `Chapitres`, `Leçons` |
| TD | `TD`, `Exercices`, `Séries` |
| TP | `TP`, `Labs`, `Travaux pratiques` |
| Correction | `Corrections`, `Corrigés`, `Solutions` |
| Résumé | `Résumés`, `Fiches`, `Synthèses`, `Révisions` |
| Examen | `Examens`, `DS`, `Devoirs`, `Contrôles`, `Partiels` |

If there's no type folder, the first word of the filename is used ("TP1 - Tri.pdf" → TP). You can also set `type:` in the note's properties.

**Corrections pair up automatically.** "Correction TD 1" links to "TD 1 - Suites", the TD page gets a *voir la correction* button, and the matière map puts the two side by side. If the names don't match, add `pour: "[[TD 1 - Suites]]"` to the correction.

### Properties

| Note property | Effect |
|---|---|
| `titre` | display title (default: filename, or the note's first `# heading`) |
| `type` | force the type |
| `date` | shown on the note, used for "nouveautés" |
| `tags`, `aliases` | as in Obsidian |
| `ordre` | sort order inside its type |
| `pour` | the énoncé a correction belongs to |

| Matière note (`Analyse/Analyse.md`) | Effect |
|---|---|
| `icone` | short code shown as the matière badge, e.g. `ML` |
| `couleur` | `mauve`, `blue`, `peach`, `green`, `pink`, `teal`, `yellow`, `red`, `sky`, `lavender`, `flamingo`, `sapphire` or a hex color |
| `prof`, `description` | shown on the matière page |
| `ordre` | position in the bar (also sets the `Alt 1…9` shortcut) |

### Supported Obsidian syntax

`[[wikilinks]]`, `[[note#section|alias]]`, embeds (`![[image.png|300]]`, `![[cours.pdf]]`, `![[other note]]`, `![[note#section]]`), callouts (`> [!tip]`, foldable `> [!note]-`, plus French ones: `definition`, `theoreme`, `propriete`, `remarque`, `methode`, `exemple`), math `$…$` / `$$…$$`, highlighted code, mermaid diagrams, `==highlights==`, `#tags`, task lists (students can tick them), `%%comments%%`.

Each matière gets an auto-generated **carte** (canvas) laid out by type. Any `.canvas` file you make in Obsidian inside a matière folder becomes an extra tab, with the same format and colors.

## Customising — `site.config.json`

- `title`, `classe`, `description`: the texts on the home page
- `theme` / `accent`: defaults for first-time visitors (`mocha`, `macchiato`, `latte`, `rose-pine`, `dawn`, `tokyo-night`, `gruvbox`, `nord`, `everforest`)
- `wallpaper`: a path inside `content/` (e.g. `_assets/wall.jpg`) or a URL
- `pomodoro`: default durations in minutes
- `stations`: radio list. `{ "type": "youtube", "id": "<video id>" }` or `{ "type": "stream", "url": "<mp3/aac stream>" }`. Some stations (SomaFM, for example) block playback from other websites, so test a new stream before you add it.

The ambient sounds (rain, fire, waves, wind, brown noise) are generated in the browser, so there are no audio files to host.

## Putting it online for the class (GitHub Pages)

1. Create a GitHub repo and push this folder to its `main` branch.
2. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**.
3. Every push now rebuilds and publishes the site at `https://<you>.github.io/<repo>/` (see `.github/workflows/deploy.yml`). Share that link with the class.

Netlify, Vercel and Cloudflare Pages work as well: build command `npm run build`, output folder `dist`.

> The site is static and **public to anyone with the link**. For a private site, Cloudflare Pages + Cloudflare Access (free for small groups) can restrict it to your classmates' emails.

## What's saved where

Each student's progress (notes marked *vu*, ticked tasks), pomodoro stats, to-dos, theme and canvas card positions stay **in their own browser** (localStorage). There's no account, no server and nothing to maintain.

## Shortcuts

| Key | Action |
|---|---|
| `Ctrl K` or `/` | launcher (search notes, matières, actions; `Tab` switches mode) |
| `Alt 1…9` | jump to a matière |
| `Ctrl B` | toggle the sidebar |
| `g` / `e` / `h` | graph / study room / home |
| `p` / `m` | start or pause the pomodoro / music |

## Project layout

```
scripts/build.mjs   vault → dist/ (markdown, links, canvases, search index)
scripts/dev.mjs     local server with live reload
src/                the site itself (vanilla JS modules, no framework)
  js/views/         home, matière, note, graph, canvas, study room
  js/graph.js       force-directed graph · js/jcanvas.js  JSON Canvas renderer
  js/audio.js       ambient sound synth · js/music.js  radio + mini player
  css/style.css     everything visual
```
