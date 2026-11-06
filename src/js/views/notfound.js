import { esc } from '../util.js';

export function notFound(view, message = 'Cette page n’existe pas.') {
  view.innerHTML = `<div class="page center">
    <pre class="ascii big-ascii">(╯°□°)╯︵ ┻━┻</pre>
    <h1>404</h1>
    <p class="muted">${esc(message)}</p>
    <a class="btn primary" href="#/">retour à l'accueil</a>
  </div>`;
}
