import { fill } from './text';

/** La parte de la API de Pagefind que usamos (el módulo `pagefind.js` generado en el build). */
export interface PagefindApi {
  options(options: { baseUrl: string; bundlePath: string }): Promise<void>;
  search(query: string): Promise<{
    results: {
      data(): Promise<{ url: string; meta: { title?: string }; excerpt: string }>;
    }[];
  }>;
}

export interface SearchHit {
  url: string;
  title: string;
  /** HTML de Pagefind: texto escapado con `<mark>` en las coincidencias. */
  excerpt: string;
}

/** La base con barra final: `''` y `/` son la raíz; `/repo` pasa a `/repo/`. */
export function normalizeBase(base: string): string {
  return base.endsWith('/') ? base : `${base}/`;
}

/** Dónde vive el módulo de Pagefind y su paquete, siempre bajo la `base` del sitio. */
export function pagefindUrl(base: string): { module: string; bundlePath: string } {
  const root = normalizeBase(base);
  return { module: `${root}pagefind/pagefind.js`, bundlePath: `${root}pagefind/` };
}

/** Importa un módulo por URL; el `@vite-ignore` evita que Vite intente resolverlo en el build. */
function defaultImporter(url: string): Promise<unknown> {
  return import(/* @vite-ignore */ url);
}

/** Carga y configura Pagefind; `undefined` si no hay índice (en desarrollo aún no hay build), que es un estado normal. */
export async function loadPagefind(
  base: string,
  importer: (url: string) => Promise<unknown> = defaultImporter,
): Promise<PagefindApi | undefined> {
  const { module, bundlePath } = pagefindUrl(base);
  try {
    const api = (await importer(module)) as Partial<PagefindApi> | undefined;
    if (typeof api?.search !== 'function' || typeof api.options !== 'function') return undefined;
    await api.options({ baseUrl: normalizeBase(base), bundlePath });
    return api as PagefindApi;
  } catch {
    return undefined;
  }
}

/** Busca y resuelve los primeros `limit` resultados. Una consulta en blanco no busca. */
export async function runSearch(
  api: PagefindApi,
  query: string,
  limit: number,
): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const { results } = await api.search(query);
  return Promise.all(
    results.slice(0, limit).map(async (result) => {
      const { url, meta, excerpt } = await result.data();
      return { url, title: meta.title || url, excerpt };
    }),
  );
}

/** Trocea un extracto de Pagefind en texto y coincidencias; solo reconoce `<mark>`, lo demás es texto, así que nunca se ejecuta HTML. */
export function excerptParts(excerpt: string): { text: string; mark: boolean }[] {
  function decode(text: string) {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  }
  const parts: { text: string; mark: boolean }[] = [];
  for (const [index, chunk] of excerpt.split(/<\/?mark>/).entries()) {
    if (chunk) parts.push({ text: decode(chunk), mark: index % 2 === 1 });
  }
  return parts;
}

export interface SearchOptions {
  importer?: (url: string) => Promise<unknown>;
  /** Espera tras teclear antes de buscar. */
  debounceMs?: number;
  /** Programa la búsqueda; por defecto `setTimeout`. Inyectable en los tests. */
  schedule?: (callback: () => void, ms: number) => void;
  limit?: number;
}

/** Cablea `[data-search]` (los textos vienen de `data-*`); Pagefind se carga al primer uso y sin índice se explica sin errores en consola. */
export function initSearch(
  root: HTMLElement,
  {
    importer,
    debounceMs = 150,
    schedule = (callback, ms) => void setTimeout(callback, ms),
    limit = 8,
  }: SearchOptions = {},
): void {
  const foundInput = root.querySelector<HTMLInputElement>('[data-search-input]');
  const foundStatus = root.querySelector<HTMLElement>('[data-search-status]');
  const foundList = root.querySelector<HTMLElement>('[data-search-results]');
  if (!foundInput || !foundStatus || !foundList) return;
  /* Las declaraciones de abajo no heredan el descarte de `null`: se fija en constantes. */
  const input = foundInput;
  const status = foundStatus;
  const list = foundList;

  const htmlDocument = root.ownerDocument;
  const base = root.dataset.baseUrl ?? '/';
  let api: Promise<PagefindApi | undefined> | undefined;
  let latest = 0;

  function setState(state: string | undefined, message = '') {
    if (state) root.setAttribute('data-state', state);
    else root.removeAttribute('data-state');
    status.textContent = message;
  }

  function render(hits: SearchHit[]) {
    list.replaceChildren(
      ...hits.map((hit) => {
        const item = htmlDocument.createElement('li');
        const link = htmlDocument.createElement('a');
        link.setAttribute('href', hit.url);
        const title = htmlDocument.createElement('span');
        title.textContent = hit.title;
        const excerpt = htmlDocument.createElement('span');
        for (const part of excerptParts(hit.excerpt)) {
          if (part.mark) {
            const mark = htmlDocument.createElement('mark');
            mark.textContent = part.text;
            excerpt.append(mark);
          } else {
            excerpt.append(htmlDocument.createTextNode(part.text));
          }
        }
        link.append(title, excerpt);
        item.append(link);
        return item;
      }),
    );
  }

  async function search() {
    const query = input.value;
    const ticket = ++latest;
    if (!query.trim()) {
      render([]);
      setState(undefined);
      return;
    }
    api ??= loadPagefind(base, importer);
    const loaded = await api;
    if (ticket !== latest) return;
    if (!loaded) {
      render([]);
      setState('unavailable', root.dataset.requiresBuild ?? '');
      return;
    }
    const hits = await runSearch(loaded, query, limit);
    if (ticket !== latest) return;
    render(hits);
    if (hits.length) setState('results');
    else setState('empty', fill(root.dataset.noResults ?? '', { query }));
  }

  input.addEventListener('input', () => schedule(() => void search(), debounceMs));

  function links() {
    return [...list.querySelectorAll<HTMLElement>('a')];
  }
  root.addEventListener('keydown', (event) => {
    const { key } = event as KeyboardEvent;
    const target = event.target as Element;
    const all = links();
    const at = all.indexOf(target as HTMLElement);
    if (key === 'Escape') {
      input.value = '';
      void search();
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      all[at + 1]?.focus();
    } else if (key === 'ArrowUp' && at >= 0) {
      event.preventDefault();
      if (at === 0) input.focus();
      else all[at - 1]?.focus();
    }
  });
}

/** ¿Se está escribiendo en este elemento? Entonces «/» es un carácter más, no un atajo. */
function isTyping(target: EventTarget | null): boolean {
  const element = target as Element | null;
  if (!element || typeof element.closest !== 'function') return false;
  return (
    element.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') !==
    null
  );
}

/** Atajo «/» al buscador; se ignora al escribir en un campo, con Ctrl/Meta/Alt (no Mayús: la barra es Mayús+7 en muchos teclados) o si otro manejador ya lo atendió. */
export function initSearchShortcut(htmlDocument: Document): void {
  /* La pista «/» del campo solo se enseña con esta marca: sin JS el atajo no existe y no se anuncia. */
  for (const root of htmlDocument.querySelectorAll('[data-search]'))
    root.setAttribute('data-shortcut', '');
  htmlDocument.addEventListener('keydown', (event) => {
    const { key, ctrlKey, metaKey, altKey, defaultPrevented } = event as KeyboardEvent;
    if (key !== '/' || ctrlKey || metaKey || altKey || defaultPrevented) return;
    if (isTyping(event.target)) return;
    const input = htmlDocument.querySelector<HTMLInputElement>('[data-search-input]');
    if (!input) return;
    event.preventDefault();
    input.focus();
  });
}
