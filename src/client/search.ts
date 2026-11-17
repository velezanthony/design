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
const defaultImporter = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);

/**
 * Carga y configura Pagefind. `undefined` si no se puede: sin índice (servidor de desarrollo,
 * donde aún no hay build) la importación falla, y eso es un estado normal, no un error.
 */
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

/**
 * Trocea un extracto de Pagefind en texto y coincidencias. Solo reconoce `<mark>`: cualquier otra
 * etiqueta queda como texto, así que lo que se pinte con esto nunca ejecuta HTML. Descodifica
 * las entidades que Pagefind escapa.
 */
export function excerptParts(excerpt: string): { text: string; mark: boolean }[] {
  const decode = (text: string) =>
    text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  const parts: { text: string; mark: boolean }[] = [];
  for (const [i, chunk] of excerpt.split(/<\/?mark>/).entries()) {
    if (chunk) parts.push({ text: decode(chunk), mark: i % 2 === 1 });
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

/**
 * Cablea el control `[data-search]`: `[data-search-input]`, `[data-search-status]` (con
 * `role="status"`) y `[data-search-results]`. Lee del propio elemento `data-base-url`, y los
 * textos `data-requires-build` y `data-no-results` (el catálogo de UI ya fusionado). Carga
 * Pagefind al primer uso; si no hay índice explica que existe tras el build, sin errores en
 * consola. Teclado: Flecha abajo salta del campo a los resultados y entre ellos, Flecha arriba
 * vuelve, Escape vacía.
 */
export function initSearch(
  root: HTMLElement,
  {
    importer,
    debounceMs = 150,
    schedule = (cb, ms) => void setTimeout(cb, ms),
    limit = 8,
  }: SearchOptions = {},
): void {
  const input = root.querySelector<HTMLInputElement>('[data-search-input]');
  const status = root.querySelector<HTMLElement>('[data-search-status]');
  const list = root.querySelector<HTMLElement>('[data-search-results]');
  if (!input || !status || !list) return;

  const doc = root.ownerDocument;
  const base = root.dataset.baseUrl ?? '/';
  let api: Promise<PagefindApi | undefined> | undefined;
  let latest = 0;

  const setState = (state: string | undefined, message = '') => {
    if (state) root.setAttribute('data-state', state);
    else root.removeAttribute('data-state');
    status.textContent = message;
  };

  const render = (hits: SearchHit[]) => {
    list.replaceChildren(
      ...hits.map((hit) => {
        const item = doc.createElement('li');
        const link = doc.createElement('a');
        link.setAttribute('href', hit.url);
        const title = doc.createElement('span');
        title.textContent = hit.title;
        const excerpt = doc.createElement('span');
        for (const part of excerptParts(hit.excerpt)) {
          if (part.mark) {
            const mark = doc.createElement('mark');
            mark.textContent = part.text;
            excerpt.append(mark);
          } else {
            excerpt.append(doc.createTextNode(part.text));
          }
        }
        link.append(title, excerpt);
        item.append(link);
        return item;
      }),
    );
  };

  const search = async () => {
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
    else
      setState(
        'empty',
        (root.dataset.noResults ?? '').replace('{query}', () => query),
      );
  };

  input.addEventListener('input', () => schedule(() => void search(), debounceMs));

  const links = () => [...list.querySelectorAll<HTMLElement>('a')];
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

/**
 * Atajo de teclado: «/» lleva el foco al buscador (el primero de la página). Se ignora mientras se
 * escribe en un campo, con Ctrl, Meta o Alt (Mayús no cuenta: en muchos teclados la barra es
 * Mayús+7) y si otro manejador ya atendió la tecla. Sin buscador no hace nada y la tecla sigue su
 * curso.
 */
export function initSearchShortcut(doc: Document): void {
  doc.addEventListener('keydown', (event) => {
    const { key, ctrlKey, metaKey, altKey, defaultPrevented } = event as KeyboardEvent;
    if (key !== '/' || ctrlKey || metaKey || altKey || defaultPrevented) return;
    if (isTyping(event.target)) return;
    const input = doc.querySelector<HTMLInputElement>('[data-search-input]');
    if (!input) return;
    event.preventDefault();
    input.focus();
  });
}
