#!/usr/bin/env node
// Compiles the Obsidian vault in content/ into the static site in dist/.
//
//   content/<Matière>/<Type folder>/<note>.md|.pdf|...
//
// Every top-level folder is a matière. The sub-folder (Cours, TP, TD,
// Corrections, Résumés, Examens…) or the `type:` property decides the type.

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedKatex from 'marked-katex-extension';
import hljs from 'highlight.js';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT = path.join(ROOT, 'content');
export const SRC = path.join(ROOT, 'src');
export const DIST = path.join(ROOT, 'dist');

const TYPES = [
  { id: 'cours', label: 'Cours', plural: 'Cours', color: 'blue', icon: 'book', match: ['cours', 'course', 'courses', 'chapitre', 'chapitres', 'chap', 'lecon', 'lecons'] },
  { id: 'td', label: 'TD', plural: 'TD & exercices', color: 'yellow', icon: 'pencil', match: ['td', 'tds', 'exercice', 'exercices', 'exo', 'exos', 'serie', 'series'] },
  { id: 'tp', label: 'TP', plural: 'TP', color: 'green', icon: 'flask', match: ['tp', 'tps', 'lab', 'labs', 'travaux pratiques'] },
  { id: 'correction', label: 'Correction', plural: 'Corrections', color: 'teal', icon: 'check', match: ['correction', 'corrections', 'corrige', 'corriges', 'solution', 'solutions'] },
  { id: 'resume', label: 'Résumé', plural: 'Résumés', color: 'mauve', icon: 'sticky', match: ['resume', 'resumes', 'fiche', 'fiches', 'synthese', 'syntheses', 'summary', 'revision', 'revisions'] },
  { id: 'examen', label: 'Examen', plural: 'Examens', color: 'red', icon: 'exam', match: ['examen', 'examens', 'exam', 'exams', 'ds', 'devoir', 'devoirs', 'controle', 'controles', 'anciens examens', 'partiel', 'partiels'] },
  { id: 'autre', label: 'Ressource', plural: 'Ressources', color: 'overlay2', icon: 'file', match: ['ressource', 'ressources', 'resources', 'divers', 'autre', 'autres'] },
];
const TYPE_ORDER = Object.fromEntries(TYPES.map((t, i) => [t.id, i]));
const MATIERE_COLORS = ['mauve', 'blue', 'peach', 'green', 'pink', 'teal', 'yellow', 'sapphire', 'red', 'lavender', 'flamingo', 'sky'];
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp']);
const AUDIO_EXT = new Set(['mp3', 'ogg', 'wav', 'm4a', 'flac']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov']);
const IGNORED_DIRS = new Set(['templates', '_templates', 'node_modules']);
const HOME_NOTES = ['accueil', 'index', 'home', 'readme'];

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const natural = (a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slugPath = (rel) => rel.split('/').map(slugify).join('/');
const fileUrl = (rel) => 'files/' + rel.split('/').map(encodeURIComponent).join('/');
const extOf = (rel) => path.posix.extname(rel).slice(1).toLowerCase();
const stripExt = (rel) => rel.slice(0, rel.length - path.posix.extname(rel).length);
const pick = (obj, ...keys) => keys.map((k) => obj[k]).find((v) => v != null && v !== '');
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v.flat(Infinity) : [v]).map(String);

function matchType(value) {
  const s = norm(value).replace(/[\s_-]*\d+$/, '');
  const find = (k) => TYPES.find((t) => t.id === k || t.match.includes(k))?.id;
  return find(s) ?? find(s.split(/[^a-z]+/)[0]);
}

function detectType(folders, name, fm) {
  const explicit = pick(fm, 'type', 'categorie');
  if (explicit) {
    const t = matchType(explicit);
    if (t) return t;
  }
  for (const f of folders) {
    const t = matchType(f);
    if (t) return t;
  }
  return matchType(norm(name).split(/[^a-z]+/).filter(Boolean)[0] ?? '') ?? 'autre';
}

function splitFrontmatter(src, rel, warnings) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
  if (!m) return { fm: {}, body: src };
  let fm = {};
  try {
    fm = YAML.parse(m[1]) ?? {};
  } catch (e) {
    warnings.push(`${rel}: propriétés YAML invalides (${e.message.split('\n')[0]})`);
  }
  if (typeof fm !== 'object' || Array.isArray(fm)) fm = {};
  return { fm, body: src.slice(m[0].length) };
}

// Obsidian accepts links in properties: `pour: "[[TP 1]]"` — or unquoted, which YAML reads as [["TP 1"]].
function frontmatterLinks(value, out = []) {
  if (typeof value === 'string') for (const m of value.matchAll(/\[\[([^\]]+)\]\]/g)) out.push(m[1]);
  else if (Array.isArray(value)) {
    if (value.length === 1 && Array.isArray(value[0]) && value[0].length === 1 && typeof value[0][0] === 'string') out.push(value[0][0]);
    else value.forEach((v) => frontmatterLinks(v, out));
  } else if (value && typeof value === 'object') Object.values(value).forEach((v) => frontmatterLinks(v, out));
  return out;
}

// Removes %% comments %% outside of fenced code blocks (MATLAB uses %% in code).
function stripComments(md) {
  return md
    .split(/(^```[\s\S]*?^```)/m)
    .map((part, i) => (i % 2 ? part : part.replace(/%%[\s\S]*?%%/g, '')))
    .join('');
}

const TEX = {
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', approx: '≈', pm: '±', cdot: '·', times: '×', in: '∈', notin: '∉',
  infty: '∞', to: '→', rightarrow: '→', Rightarrow: '⇒', iff: '⇔', Leftrightarrow: '⇔', forall: '∀', exists: '∃',
  varepsilon: 'ε', epsilon: 'ε', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', lambda: 'λ', mu: 'μ', pi: 'π',
  sigma: 'σ', theta: 'θ', omega: 'ω', Omega: 'Ω', Delta: 'Δ', sum: 'Σ', prod: 'Π', int: '∫', partial: '∂',
  nabla: '∇', sqrt: '√', ldots: '…', dots: '…', cdots: '⋯', log: 'log', ln: 'ln', lim: 'lim', sin: 'sin', cos: 'cos',
};
const BLACKBOARD = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ' };

// "\frac{a}{b} \leq \mathbb{R}" → "a/b ≤ ℝ" for excerpts and search.
function texToText(tex) {
  return tex
    .replace(/\\mathbb\{(\w)\}/g, (_, c) => BLACKBOARD[c] ?? c)
    .replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/\\([a-zA-Z]+)/g, (_, w) => TEX[w] ?? '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[\[[^\]]*\]\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*>\s?(\[![^\]]*\][+-]?)?/gm, '')
    .replace(/^\s*(#{1,6}|[-*+]|\d+\.)\s+(\[.\]\s+)?/gm, '')
    .replace(/^[\s|:-]+$/gm, '')
    .replace(/\$([^$\n]+)\$/g, (_, tex) => texToText(tex))
    .replace(/\*\*|__|~~|==|`|\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerptOf(body, max = 190) {
  const text = plainText(body.replace(/^\s*#{1,6}\s.*$/gm, '').replace(/^\s*>\s*\[![^\]]*\].*$/gm, ''));
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
}

function headingText(raw) {
  return raw.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`=~$]/g, '').trim();
}

async function walk(dir, rel = '') {
  const out = [];
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (!IGNORED_DIRS.has(norm(ent.name))) out.push(...(await walk(path.join(dir, ent.name), r)));
    } else if (ent.isFile()) out.push(r);
  }
  return out;
}

function gitDates() {
  const dates = new Map();
  try {
    const opts = { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 };
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], opts).toString().trim();
    const log = execFileSync('git', ['-c', 'core.quotepath=off', 'log', '--format=%x00%cI', '--name-only', '--', CONTENT], opts).toString();
    let date = null;
    for (const line of log.split('\n')) {
      if (line.startsWith('\0')) date = line.slice(1);
      else if (line.trim()) {
        const abs = path.join(top, line);
        if (!dates.has(abs)) dates.set(abs, date);
      }
    }
  } catch {
    // not a git checkout: fall back to file mtimes
  }
  return dates;
}

async function copyIfChanged(from, to) {
  const [a, b] = await Promise.all([fs.stat(from), fs.stat(to).catch(() => null)]);
  if (b && b.size === a.size && b.mtimeMs >= a.mtimeMs) return;
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function removeStale(dir, keep, base = dir) {
  if (!existsSync(dir)) return;
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await removeStale(abs, keep, base);
      if (!(await fs.readdir(abs)).length) await fs.rmdir(abs);
    } else if (!keep.has(path.relative(base, abs).split(path.sep).join('/'))) await fs.rm(abs);
  }
}

export async function build({ quiet = false } = {}) {
  const t0 = performance.now();
  const warnings = [];
  const config = JSON.parse(await fs.readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
  const files = existsSync(CONTENT) ? (await walk(CONTENT)).sort(natural) : [];
  const dates = gitDates();

  // ── Pass 1: inventory ────────────────────────────────────────────────
  const matieres = new Map(); // id -> matiere
  const items = []; // notes and documents shown on the site
  const assets = []; // images and attachments only reachable through embeds
  const canvasFiles = [];
  let homeRel = null;

  const topFolders = [...new Set(files.filter((f) => f.includes('/')).map((f) => f.split('/')[0]))].filter((f) => !f.startsWith('_'));
  topFolders.forEach((name, i) => {
    matieres.set(slugify(name), {
      id: slugify(name), name, folder: name, icon: null, color: MATIERE_COLORS[i % MATIERE_COLORS.length],
      prof: null, description: '', html: '', order: Infinity, items: [], canvases: [], hubRel: null,
    });
  });

  for (const rel of files) {
    const parts = rel.split('/');
    const ext = extOf(rel);
    const base = path.posix.basename(rel);
    const name = stripExt(base);
    const abs = path.join(CONTENT, rel);
    const matiere = parts.length > 1 && !parts[0].startsWith('_') ? matieres.get(slugify(parts[0])) : null;
    const folders = parts.slice(1, -1);
    const inAssetFolder = parts.slice(0, -1).some((p) => p.startsWith('_'));

    if (ext === 'canvas') {
      canvasFiles.push({ rel, name, matiere });
      continue;
    }
    if (ext === 'md') {
      if (!matiere && parts.length === 1 && HOME_NOTES.includes(norm(name)) && !homeRel) {
        homeRel = rel;
        continue;
      }
      if (matiere && parts.length === 2 && ['_index', 'index', norm(matiere.folder)].includes(norm(name))) {
        matiere.hubRel = rel;
        continue;
      }
      if (inAssetFolder) continue; // templates, drafts…
    }

    const stat = await fs.stat(abs);
    const updated = dates.get(abs) ?? stat.mtime.toISOString();
    const typeFromPath = folders.some((f) => matchType(f));
    const isDocument = ext === 'md' || (!inAssetFolder && (!IMAGE_EXT.has(ext) || typeFromPath));

    if (!isDocument) {
      assets.push({ rel, ext, url: fileUrl(rel), name: base });
      continue;
    }

    let fm = {};
    let body = '';
    if (ext === 'md') ({ fm, body } = splitFrontmatter(await fs.readFile(abs, 'utf8'), rel, warnings));
    body = stripComments(body);

    const kind = ext === 'md' ? 'note' : ext === 'pdf' ? 'pdf' : IMAGE_EXT.has(ext) ? 'image' : 'file';
    const id = slugPath(ext === 'md' ? stripExt(rel) : rel);
    const item = {
      id, kind, ext, rel, name,
      title: String(pick(fm, 'titre', 'title') ?? name),
      matiere: matiere?.id ?? null,
      type: detectType(folders, name, fm),
      url: kind === 'note' ? undefined : fileUrl(rel),
      size: kind === 'note' ? undefined : stat.size,
      tags: toList(pick(fm, 'tags', 'tag')).flatMap((t) => t.split(/[,\s]+/)).map((t) => t.replace(/^#/, '')).filter(Boolean),
      aliases: toList(pick(fm, 'aliases', 'alias')),
      date: pick(fm, 'date', 'created') ? String(pick(fm, 'date', 'created')).slice(0, 10) : null,
      updated,
      order: Number(pick(fm, 'ordre', 'order')) || Infinity,
      excerpt: ext === 'md' ? excerptOf(body) : '',
      words: ext === 'md' ? plainText(body).split(' ').filter(Boolean).length : 0,
      fmLinks: frontmatterLinks(fm),
      body,
      links: [], backlinks: [], headings: [], corrections: [], enonce: null,
    };
    if (items.some((other) => other.id === id)) item.id = `${id}-${items.length}`;
    items.push(item);
  }

  // Matière hub notes: content/Analyse/Analyse.md (or _index.md) with icon, color, prof…
  for (const m of matieres.values()) {
    if (!m.hubRel) continue;
    const { fm, body } = splitFrontmatter(await fs.readFile(path.join(CONTENT, m.hubRel), 'utf8'), m.hubRel, warnings);
    m.name = String(pick(fm, 'titre', 'title', 'nom') ?? m.name);
    m.icon = pick(fm, 'icone', 'icon', 'emoji') ?? null;
    m.color = pick(fm, 'couleur', 'color') ?? m.color;
    m.prof = pick(fm, 'prof', 'enseignant', 'teacher') ?? null;
    m.order = Number(pick(fm, 'ordre', 'order')) || Infinity;
    m.description = String(pick(fm, 'description') ?? '');
    m.hubBody = stripComments(body);
  }

  // ── Link resolution ──────────────────────────────────────────────────
  const byRel = new Map();
  const byName = new Map();
  const setOnce = (map, key, entry) => key && !map.has(key) && map.set(key, entry);
  const itemEntry = (item) => ({ kind: 'item', item, node: item.id, url: item.url, ext: item.ext });

  for (const item of items.filter((i) => i.kind === 'note')) {
    setOnce(byRel, norm(stripExt(item.rel)), itemEntry(item));
    setOnce(byName, norm(item.name), itemEntry(item));
  }
  for (const m of matieres.values()) {
    const entry = { kind: 'matiere', matiere: m, node: `m:${m.id}` };
    if (m.hubRel) setOnce(byRel, norm(stripExt(m.hubRel)), entry);
    setOnce(byName, norm(m.folder), entry);
    setOnce(byName, norm(m.name), entry);
  }
  for (const item of items.filter((i) => i.kind !== 'note')) {
    setOnce(byRel, norm(item.rel), itemEntry(item));
    setOnce(byName, norm(path.posix.basename(item.rel)), itemEntry(item));
  }
  for (const asset of assets) {
    const entry = { kind: 'asset', ...asset };
    setOnce(byRel, norm(asset.rel), entry);
    setOnce(byName, norm(asset.name), entry);
  }
  for (const item of items) {
    for (const alias of item.aliases) setOnce(byName, norm(alias), itemEntry(item));
    if (item.kind !== 'note') setOnce(byName, norm(item.name), itemEntry(item)); // [[TP1]] -> TP1.pdf when no TP1.md
  }

  function resolve(target, fromRel) {
    const t = target.trim().replace(/\\/g, '/');
    if (!t) return null;
    if (fromRel && /^\.\.?\//.test(t)) {
      const joined = norm(path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), t)));
      const hit = byRel.get(joined.replace(/\.md$/, '')) ?? byRel.get(joined);
      if (hit) return hit;
    }
    const key = norm(t).replace(/^\//, '');
    const keyNoMd = key.replace(/\.md$/, '');
    let hit = byRel.get(keyNoMd) ?? byRel.get(key);
    if (!hit && key.includes('/')) {
      for (const [rel, entry] of byRel) if (rel.endsWith('/' + keyNoMd) || rel.endsWith('/' + key)) { hit = entry; break; }
    }
    return hit ?? byName.get(keyNoMd) ?? byName.get(key) ?? null;
  }

  // ── Markdown renderer (Obsidian flavoured) ───────────────────────────
  const ctx = { rel: null, links: new Set(), tags: new Set(), headings: [], slugs: new Map(), broken: [] };
  const resetCtx = (rel) => Object.assign(ctx, { rel, links: new Set(), tags: new Set(), headings: [], slugs: new Map(), broken: [] });
  const typeOf = (id) => TYPES.find((t) => t.id === id);

  const hrefFor = (entry, heading) => {
    if (entry.kind === 'matiere') return `#/m/${entry.matiere.id}`;
    if (entry.kind === 'asset') return entry.url;
    return `#/n/${entry.item.id}${heading ? `?h=${slugify(heading)}` : ''}`;
  };

  function parseTarget(raw) {
    const [targetPart, ...aliasParts] = raw.replace(/\\\|/g, '|').split('|');
    const [target, ...frag] = targetPart.split('#');
    return { target: target.trim(), heading: frag.join('#').replace(/^\^.*/, '').trim(), alias: aliasParts.join('|').trim() };
  }

  function renderWikilink(raw) {
    const { target, heading, alias } = parseTarget(raw);
    if (!target && heading) return `<a class="wikilink" href="#/n/${ctx.self ?? ''}?h=${slugify(heading)}">${escapeHtml(alias || heading)}</a>`;
    const entry = resolve(target, ctx.rel);
    const label = escapeHtml(alias || (heading ? `${target} › ${heading}` : target));
    if (!entry) {
      ctx.broken.push(target);
      return `<span class="wikilink broken" title="Note introuvable : ${escapeHtml(target)}">${label}</span>`;
    }
    if (entry.node) ctx.links.add(entry.node);
    return `<a class="wikilink" href="${hrefFor(entry, heading)}"${entry.kind === 'asset' ? ' target="_blank"' : ''}>${label}</a>`;
  }

  function renderEmbed(raw) {
    const { target, heading, alias } = parseTarget(raw);
    const entry = resolve(target, ctx.rel);
    if (!entry) {
      ctx.broken.push(target);
      return `<span class="wikilink broken" title="Fichier introuvable">${escapeHtml(target)}</span>`;
    }
    if (entry.node) ctx.links.add(entry.node);
    if (entry.kind === 'matiere') return renderWikilink(raw);
    const ext = entry.ext;
    const url = entry.url;
    if (IMAGE_EXT.has(ext)) {
      const size = /^(\d+)(?:x(\d+))?$/.exec(alias);
      const style = size ? ` style="width:${size[1]}px${size[2] ? `;height:${size[2]}px` : ''}"` : '';
      return `<img src="${url}" alt="${escapeHtml(size ? '' : alias)}" loading="lazy"${style}>`;
    }
    if (ext === 'pdf') {
      const page = heading ? `#${heading}` : '';
      return `<div class="embed-pdf"><iframe src="${url}${page}" loading="lazy" title="${escapeHtml(target)}"></iframe>`
        + `<div class="embed-pdf-bar"><span>${escapeHtml(path.posix.basename(entry.item?.rel ?? entry.rel))}</span>`
        + `<a href="${url}" target="_blank" rel="noopener">Ouvrir</a><a href="${url}" download>Télécharger</a></div></div>`;
    }
    if (AUDIO_EXT.has(ext)) return `<audio controls preload="none" src="${url}"></audio>`;
    if (VIDEO_EXT.has(ext)) return `<video controls preload="metadata" src="${url}"></video>`;
    if (entry.kind === 'item' && entry.item.kind === 'note') {
      const it = entry.item;
      return `<div class="embed-note" data-embed="${it.id}"${heading ? ` data-heading="${slugify(heading)}"` : ''}>`
        + `<a class="embed-note-head" href="#/n/${it.id}"><span class="badge t-${it.type}">${typeOf(it.type).label}</span>${escapeHtml(it.title)}</a>`
        + `<div class="embed-note-body"><p>${escapeHtml(it.excerpt)}</p></div></div>`;
    }
    return `<a class="embed-file" href="${url}" download><span>${escapeHtml(path.posix.basename(entry.rel ?? entry.item.rel))}</span><small>Télécharger</small></a>`;
  }

  const md = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      emptyLangClass: 'hljs',
      highlight(code, lang) {
        if (lang && lang !== 'mermaid' && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
          } catch { /* fall through */ }
        }
        return escapeHtml(code);
      },
    }),
    markedKatex({ throwOnError: false, nonStandard: true }),
  );
  md.setOptions({ gfm: true, breaks: true });
  md.use({
    extensions: [
      {
        name: 'wikilink',
        level: 'inline',
        start(src) {
          const i = src.indexOf('[[');
          return i < 0 ? undefined : i > 0 && src[i - 1] === '!' ? i - 1 : i;
        },
        tokenizer(src) {
          const m = /^(!?)\[\[([^[\]\n]+?)\]\]/.exec(src);
          if (m) return { type: 'wikilink', raw: m[0], embed: !!m[1], target: m[2] };
        },
        renderer: (t) => (t.embed ? renderEmbed(t.target) : renderWikilink(t.target)),
      },
      {
        name: 'mark',
        level: 'inline',
        start(src) {
          const i = src.indexOf('==');
          return i < 0 ? undefined : i;
        },
        tokenizer(src) {
          const m = /^==(?=\S)([^\n]*?\S)==/.exec(src);
          if (m) return { type: 'mark', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
        },
        renderer(t) {
          return `<mark>${this.parser.parseInline(t.tokens)}</mark>`;
        },
      },
      {
        name: 'tag',
        level: 'inline',
        start(src) {
          const m = /(^|\s)#[\p{L}\p{N}_/-]*\p{L}/u.exec(src);
          return m ? m.index + m[1].length : undefined;
        },
        tokenizer(src) {
          const m = /^#([\p{L}\p{N}_/-]*\p{L}[\p{L}\p{N}_/-]*)/u.exec(src);
          if (m) return { type: 'tag', raw: m[0], tag: m[1] };
        },
        renderer(t) {
          ctx.tags.add(t.tag);
          return `<span class="tag">#${escapeHtml(t.tag)}</span>`;
        },
      },
    ],
    walkTokens(token) {
      if (token.type !== 'blockquote') return;
      const m = /^\[!([\w-]+)\]([+-]?)[^\S\n]*(.*)(?:\n|$)/.exec(token.text);
      if (!m) return;
      token.callout = { kind: m[1].toLowerCase(), fold: m[2], title: m[3] };
      token.tokens = md.lexer(token.text.slice(m[0].length));
    },
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const text = headingText(tokens.map((t) => t.raw).join(''));
        let id = slugify(text);
        const n = ctx.slugs.get(id) ?? 0;
        ctx.slugs.set(id, n + 1);
        if (n) id += `-${n}`;
        ctx.headings.push({ depth, text, id });
        return `<h${depth} id="${id}">${html}</h${depth}>\n`;
      },
      code({ text, lang, escaped }) {
        if ((lang ?? '').trim() !== 'mermaid') return false;
        return `<pre class="mermaid">${escaped ? text : escapeHtml(text)}</pre>\n`;
      },
      blockquote(token) {
        if (!token.callout) return false;
        const { kind, fold, title } = token.callout;
        const titleHtml = title ? md.parseInline(title) : kind.charAt(0).toUpperCase() + kind.slice(1);
        const body = this.parser.parse(token.tokens);
        if (fold) {
          return `<details class="callout" data-callout="${kind}"${fold === '+' ? ' open' : ''}><summary class="callout-title">${titleHtml}</summary><div class="callout-content">${body}</div></details>\n`;
        }
        return `<div class="callout" data-callout="${kind}"><div class="callout-title">${titleHtml}</div><div class="callout-content">${body}</div></div>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
          return `<a href="${escapeHtml(href)}" class="external" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
        }
        if (href.startsWith('#')) return `<a href="#/n/${ctx.self ?? ''}?h=${slugify(href.slice(1))}"${titleAttr}>${text}</a>`;
        let decoded = href;
        try { decoded = decodeURI(href); } catch { /* keep raw */ }
        const [target, heading] = decoded.split('#');
        const entry = resolve(target, ctx.rel);
        if (!entry) return `<a href="${escapeHtml(href)}"${titleAttr}>${text}</a>`;
        if (entry.node) ctx.links.add(entry.node);
        return `<a class="wikilink" href="${hrefFor(entry, heading)}"${titleAttr}>${text}</a>`;
      },
      image({ href, title, text }) {
        let src = href;
        if (!/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) {
          let decoded = href;
          try { decoded = decodeURI(href); } catch { /* keep raw */ }
          const entry = resolve(decoded, ctx.rel);
          if (entry?.url) src = entry.url;
        }
        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(text)}" loading="lazy"${title ? ` title="${escapeHtml(title)}"` : ''}>`;
      },
    },
  });

  const render = (body, rel, self) => {
    resetCtx(rel);
    ctx.self = self;
    const html = md.parse(body);
    if (ctx.broken.length) warnings.push(`${rel}: lien(s) introuvable(s) → ${[...new Set(ctx.broken)].join(', ')}`);
    return html;
  };

  // ── Pass 2: render notes ─────────────────────────────────────────────
  const htmlById = new Map();
  for (const item of items) {
    if (item.kind === 'note') {
      htmlById.set(item.id, render(item.body, item.rel, item.id));
      item.headings = ctx.headings;
      item.links = [...ctx.links];
      item.tags = [...new Set([...item.tags, ...ctx.tags])];
    }
    for (const target of item.fmLinks) {
      const entry = resolve(target.split('|')[0].split('#')[0], item.rel);
      if (entry?.node && !item.links.includes(entry.node)) item.links.push(entry.node);
    }
  }
  for (const m of matieres.values()) {
    if (m.hubBody) m.html = render(m.hubBody, m.hubRel, null);
    delete m.hubBody;
  }
  const homeHtml = homeRel ? render(splitFrontmatter(await fs.readFile(path.join(CONTENT, homeRel), 'utf8'), homeRel, warnings).body, homeRel, null) : '';

  // Corrections ↔ énoncés: explicit link from a correction, or matching names ("Correction TP 1" ↔ "TP 1").
  const pairKey = (title) => norm(title).replace(/\b(correction|corrections|corrige|corriges|corr|solution|solutions|de|du|des|la|le|l)\b/g, '').replace(/[^a-z0-9]/g, '');
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const corr of items.filter((i) => i.type === 'correction')) {
    const siblings = items.filter((i) => i.matiere === corr.matiere && i.type !== 'correction');
    // "td1" pairs with "td1suites" but not with "td12"
    const pairs = (a, b) => b === a || (/\d$/.test(a) && b.startsWith(a) && !/\d/.test(b[a.length]));
    const target = corr.fmLinks.map((t) => resolve(t, corr.rel)?.item).find((i) => i && i.type !== 'correction')
      ?? siblings.find((i) => pairs(pairKey(corr.title), pairKey(i.title)))
      ?? siblings.find((i) => pairs(pairKey(corr.name), pairKey(i.name)));
    if (!target) continue;
    corr.enonce = target.id;
    target.corrections.push(corr.id);
    if (!corr.links.includes(target.id)) corr.links.push(target.id);
  }

  for (const item of items) {
    for (const l of item.links) byId.get(l)?.backlinks.push(item.id);
    item.links = item.links.filter((l) => l !== item.id);
  }

  // ── Canvases ─────────────────────────────────────────────────────────
  const canvases = [];
  for (const cf of canvasFiles) {
    let data;
    try {
      data = JSON.parse(await fs.readFile(path.join(CONTENT, cf.rel), 'utf8'));
    } catch (e) {
      warnings.push(`${cf.rel}: canvas illisible (${e.message})`);
      continue;
    }
    const nodes = (data.nodes ?? []).map((n) => {
      const node = { ...n };
      if (n.type === 'text') node.html = render(n.text ?? '', cf.rel, null);
      if (n.type === 'file') {
        const entry = resolve(n.file ?? '', cf.rel);
        if (entry?.kind === 'item') node.ref = entry.item.id;
        else if (entry?.kind === 'matiere') node.matiereRef = entry.matiere.id;
        else if (entry?.url) node.src = entry.url;
        if (entry?.ext) node.ext = entry.ext;
        if (n.subpath) node.heading = slugify(n.subpath.replace(/^#/, ''));
      }
      return node;
    });
    const canvas = { id: `c/${slugPath(stripExt(cf.rel))}`, title: cf.name, matiere: cf.matiere?.id ?? null, rel: cf.rel, auto: false, nodes, edges: data.edges ?? [] };
    canvases.push(canvas);
    cf.matiere?.canvases.push(canvas.id);
  }

  const sortItems = (a, b) => (a.order - b.order) || natural(a.title, b.title);
  for (const m of matieres.values()) {
    m.items = items.filter((i) => i.matiere === m.id).sort(sortItems).map((i) => i.id);
    const auto = autoCanvas(m, m.items.map((id) => byId.get(id)));
    canvases.push(auto);
    m.canvases.unshift(auto.id);
  }

  // ── Output ───────────────────────────────────────────────────────────
  const orderedMatieres = [...matieres.values()].sort((a, b) => (a.order - b.order) || natural(a.name, b.name));
  const vault = {
    site: {
      ...config,
      wallpaper: config.wallpaper && !/^(https?:)?\/\//.test(config.wallpaper) ? fileUrl(config.wallpaper) : config.wallpaper ?? null,
    },
    builtAt: new Date().toISOString(),
    types: TYPES.map(({ match, ...t }) => t),
    home: { html: homeHtml },
    matieres: orderedMatieres.map(({ hubRel, folder, order, ...m }) => m),
    items: items.sort((a, b) => natural(a.matiere ?? '~', b.matiere ?? '~') || (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || sortItems(a, b))
      .map(({ body, fmLinks, order, name, aliases, ...i }) => i),
    canvases,
  };
  const search = items.map((i) => ({ id: i.id, text: i.kind === 'note' ? plainText(i.body).slice(0, 30000) : '' }));

  await fs.mkdir(DIST, { recursive: true });
  await fs.cp(SRC, DIST, { recursive: true });
  await fs.rm(path.join(DIST, 'data'), { recursive: true, force: true });
  await fs.mkdir(path.join(DIST, 'data', 'html'), { recursive: true });
  await fs.writeFile(path.join(DIST, 'data', 'vault.json'), JSON.stringify(vault));
  await fs.writeFile(path.join(DIST, 'data', 'search.json'), JSON.stringify(search));
  await Promise.all([...htmlById].map(async ([id, html]) => {
    const out = path.join(DIST, 'data', 'html', `${id}.html`);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, html);
  }));

  const katexDist = path.join(ROOT, 'node_modules', 'katex', 'dist');
  await copyIfChanged(path.join(katexDist, 'katex.min.css'), path.join(DIST, 'vendor', 'katex', 'katex.min.css'));
  for (const font of await fs.readdir(path.join(katexDist, 'fonts'))) {
    if (font.endsWith('.woff2')) await copyIfChanged(path.join(katexDist, 'fonts', font), path.join(DIST, 'vendor', 'katex', 'fonts', font));
  }

  const published = [...items.filter((i) => i.kind !== 'note').map((i) => i.rel), ...assets.map((a) => a.rel)];
  await Promise.all(published.map((rel) => copyIfChanged(path.join(CONTENT, rel), path.join(DIST, 'files', rel))));
  await removeStale(path.join(DIST, 'files'), new Set(published));

  const stats = { matieres: matieres.size, notes: items.filter((i) => i.kind === 'note').length, documents: items.filter((i) => i.kind !== 'note').length, canvases: canvasFiles.length, ms: Math.round(performance.now() - t0), warnings };
  if (!quiet) {
    console.log(`✿ ${stats.matieres} matières · ${stats.notes} notes · ${stats.documents} documents · ${stats.canvases} canvas — ${stats.ms} ms`);
    for (const w of warnings) console.warn(`  ⚠ ${w}`);
  }
  return stats;
}

// Auto-generated board for a matière: one group per type, corrections placed next to their énoncé.
function autoCanvas(m, items) {
  const W = 280, H = 140, GAP = 26, PAD = 30, PAIR_GAP = 90, COL_GAP = 130;
  const nodes = [];
  const edges = [];
  const nodeId = (item) => `n-${item.id}`;
  const card = (item, x, y) => nodes.push({ id: nodeId(item), type: 'file', ref: item.id, x, y, width: W, height: H });
  const ids = new Set(items.map((i) => i.id));
  const placed = new Set();
  let x = 0;

  const columns = TYPES.map((t) => [t, items.filter((i) => i.type === t.id && (t.id !== 'correction' || !i.enonce || !ids.has(i.enonce)))]);
  for (const [type, list] of columns) {
    if (!list.length) continue;
    const paired = list.some((i) => i.corrections.some((c) => ids.has(c)));
    let y = PAD;
    const start = nodes.length;
    for (const item of list) {
      card(item, x + PAD, y);
      placed.add(item.id);
      const corrs = item.corrections.filter((c) => ids.has(c)).map((c) => items.find((i) => i.id === c));
      corrs.forEach((corr, k) => {
        card(corr, x + PAD + W + PAIR_GAP, y + k * (H + GAP));
        placed.add(corr.id);
        edges.push({ id: `e-${edges.length}`, fromNode: nodeId(item), fromSide: 'right', toNode: nodeId(corr), toSide: 'left', label: 'corrigé', color: '4' });
      });
      y += Math.max(1, corrs.length) * (H + GAP);
    }
    const width = PAD * 2 + W + (paired ? W + PAIR_GAP : 0);
    nodes.splice(start, 0, { id: `g-${type.id}`, type: 'group', label: type.plural, x, y: 0, width, height: y - GAP + PAD, color: type.color });
    x += width + COL_GAP;
  }

  const seen = new Set(edges.map((e) => [e.fromNode, e.toNode].sort().join('|')));
  for (const item of items) {
    for (const link of item.links) {
      if (!ids.has(link) || link === item.id) continue;
      const key = [nodeId(item), `n-${link}`].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ id: `e-${edges.length}`, fromNode: nodeId(item), toNode: `n-${link}` });
    }
  }
  return { id: `c/${m.id}/_carte`, title: `Carte — ${m.name}`, matiere: m.id, auto: true, nodes, edges };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
