#!/usr/bin/env node
// Builds, serves dist/ and rebuilds + live-reloads whenever content/, src/ or the config change.
//   npm run dev              → http://localhost:5173
//   npm run dev -- --host    → also reachable from other devices on your Wi-Fi

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, ROOT, CONTENT, SRC, DIST } from './build.mjs';

const PORT = Number(process.env.PORT) || 5173;
const HOST = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1';
const MIME = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', svg: 'image/svg+xml', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  woff2: 'font/woff2', pdf: 'application/pdf', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
  mp4: 'video/mp4', webm: 'video/webm', txt: 'text/plain; charset=utf-8',
};
const RELOAD = "<script>new EventSource('/__reload').onmessage = () => location.reload();</script>";
const clients = new Set();

let running = null;
let again = false;
async function rebuild() {
  if (running) {
    again = true;
    return;
  }
  running = build().catch((e) => console.error(`✗ build: ${e.message}`));
  await running;
  running = null;
  for (const res of clients) res.write('data: reload\n\n');
  if (again) {
    again = false;
    rebuild();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  let file = path.join(DIST, decodeURIComponent(url.pathname));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    if ((await fs.promises.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    await fs.promises.access(file);
  } catch {
    return res.writeHead(404, { 'Content-Type': MIME.txt }).end('404');
  }
  const headers = { 'Content-Type': MIME[path.extname(file).slice(1).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (file === path.join(DIST, 'index.html')) {
    const html = (await fs.promises.readFile(file, 'utf8')).replace('</body>', `${RELOAD}</body>`);
    return res.writeHead(200, headers).end(html);
  }
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});

let timer;
const onChange = (dir) => (event, name) => {
  // Obsidian rewrites .obsidian/workspace.json constantly; ignore dot folders.
  if (name && name.split(path.sep).some((p) => p.startsWith('.'))) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`↻ ${path.relative(ROOT, path.join(dir, name ?? ''))}`);
    rebuild();
  }, 200);
};

await rebuild();
for (const dir of [CONTENT, SRC]) if (fs.existsSync(dir)) fs.watch(dir, { recursive: true }, onChange(dir));
fs.watch(path.join(ROOT, 'site.config.json'), onChange(ROOT));

server.listen(PORT, HOST, () => {
  console.log(`\n  ☕ cozy·class  →  http://localhost:${PORT}`);
  if (HOST === '0.0.0.0') {
    for (const addr of Object.values(os.networkInterfaces()).flat()) {
      if (addr?.family === 'IPv4' && !addr.internal) console.log(`                 →  http://${addr.address}:${PORT}  (réseau local)`);
    }
  }
  console.log('  Modifie content/ (ou ouvre-le comme vault Obsidian) : le site se recharge tout seul.\n');
});
