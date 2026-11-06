// Post-processing for rendered notes: code blocks, task lists, transclusions, mermaid.
import { noteHtml } from './data.js';
import { color } from './themes.js';
import { icon } from './icons.js';
import { store, toast } from './util.js';

const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
let mermaidLib;

export function enhance(root, { id = null, depth = 0 } = {}) {
  for (const pre of root.querySelectorAll('pre:not(.mermaid):not([data-enhanced])')) {
    pre.dataset.enhanced = '';
    const code = pre.querySelector('code');
    const lang = /language-([\w+#-]+)/.exec(code?.className ?? '')?.[1];
    const head = document.createElement('div');
    head.className = 'code-head';
    head.innerHTML = `${lang ? `<span>${lang}</span>` : ''}<button class="code-copy" title="Copier">${icon('copy')}</button>`;
    head.querySelector('button').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code?.innerText ?? pre.innerText);
        toast('Code copié', { icon: icon('copy'), timeout: 1600 });
      } catch {
        toast('Copie impossible ici');
      }
    });
    pre.prepend(head);
  }

  for (const table of root.querySelectorAll('table:not([data-enhanced])')) {
    table.dataset.enhanced = '';
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.replaceWith(wrap);
    wrap.append(table);
  }

  // Task lists stay tickable; state is remembered per note in this browser.
  if (id) {
    const boxes = [...root.querySelectorAll('input[type="checkbox"]')];
    const key = `tasks.${id}`;
    const saved = store.get(key, null);
    boxes.forEach((box, i) => {
      box.disabled = false;
      box.closest('li')?.classList.add('task');
      if (saved) box.checked = saved.includes(i);
      box.closest('li')?.classList.toggle('checked', box.checked);
      box.addEventListener('change', () => {
        box.closest('li')?.classList.toggle('checked', box.checked);
        store.set(key, boxes.flatMap((b, j) => (b.checked ? [j] : [])));
      });
    });
  }

  if (depth < 2) {
    for (const el of root.querySelectorAll('.embed-note[data-embed]:not([data-loaded])')) {
      el.dataset.loaded = '';
      noteHtml(el.dataset.embed).then((html) => {
        const body = el.querySelector('.embed-note-body');
        body.innerHTML = html;
        if (el.dataset.heading) keepSection(body, el.dataset.heading);
        enhance(body, { depth: depth + 1 });
      }).catch(() => {});
    }
  }

  renderMermaid(root);
}

// Keeps only the heading `id` and what follows it until the next heading of the same or higher level.
function keepSection(body, id) {
  const h = body.querySelector(`#${CSS.escape(id)}`);
  if (!h || h.parentElement !== body) return;
  const level = Number(h.tagName[1]);
  const keep = [h];
  for (let n = h.nextElementSibling; n && !(/^H[1-6]$/.test(n.tagName) && Number(n.tagName[1]) <= level); n = n.nextElementSibling) keep.push(n);
  body.replaceChildren(...keep);
}

async function renderMermaid(root) {
  const blocks = [...root.querySelectorAll('pre.mermaid:not([data-processed])')];
  if (!blocks.length) return;
  try {
    mermaidLib ??= import(MERMAID).then((m) => m.default);
    const mermaid = await mermaidLib;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      fontFamily: '"JetBrains Mono", monospace',
      themeVariables: {
        background: color('base'),
        primaryColor: color('surface0'),
        primaryTextColor: color('text'),
        primaryBorderColor: color('accent'),
        secondaryColor: color('mantle'),
        tertiaryColor: color('crust'),
        lineColor: color('overlay1'),
        textColor: color('text'),
        mainBkg: color('surface0'),
        nodeBorder: color('accent'),
        clusterBkg: color('mantle'),
        edgeLabelBackground: color('base'),
      },
    });
    await mermaid.run({ nodes: blocks });
  } catch {
    blocks.forEach((b) => b.classList.add('mermaid-failed'));
  }
}
