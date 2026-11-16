import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import {
  type PagefindApi,
  excerptParts,
  initSearch,
  loadPagefind,
  normalizeBase,
  pagefindUrl,
  runSearch,
} from './search';

const fakeApi = (
  docs: { url: string; title: string; excerpt: string }[] = [],
): PagefindApi & { options: ReturnType<typeof vi.fn>; search: ReturnType<typeof vi.fn> } => ({
  options: vi.fn(() => Promise.resolve()),
  search: vi.fn((q: string) =>
    Promise.resolve({
      results: q
        ? docs.map((d) => ({
            data: () =>
              Promise.resolve({ url: d.url, meta: { title: d.title }, excerpt: d.excerpt }),
          }))
        : [],
    }),
  ),
});

describe('normalizeBase / pagefindUrl', () => {
  it.each([
    ['/', '/'],
    ['/repo', '/repo/'],
    ['/repo/', '/repo/'],
    ['', '/'],
  ])('normaliza %j a %j', (input, expected) => {
    expect(normalizeBase(input)).toBe(expected);
  });

  it('el módulo y el paquete cuelgan de la base del sitio', () => {
    expect(pagefindUrl('/repo')).toEqual({
      module: '/repo/pagefind/pagefind.js',
      bundlePath: '/repo/pagefind/',
    });
    expect(pagefindUrl('/').module).toBe('/pagefind/pagefind.js');
  });
});

describe('loadPagefind', () => {
  it('importa el módulo de la base y lo configura con baseUrl y bundlePath', async () => {
    const api = fakeApi();
    const importer = vi.fn(() => Promise.resolve(api));
    const loaded = await loadPagefind('/repo/', importer);
    expect(importer).toHaveBeenCalledWith('/repo/pagefind/pagefind.js');
    expect(api.options).toHaveBeenCalledWith({ baseUrl: '/repo/', bundlePath: '/repo/pagefind/' });
    expect(loaded).toBe(api);
  });

  it('es undefined si la importación falla (sin índice)', async () => {
    const importer = () => Promise.reject(new Error('404'));
    expect(await loadPagefind('/repo/', importer)).toBeUndefined();
  });

  it('es undefined si el módulo no expone la API', async () => {
    expect(await loadPagefind('/', () => Promise.resolve({}))).toBeUndefined();
  });

  it('es undefined si configurar falla', async () => {
    const api = fakeApi();
    api.options.mockRejectedValueOnce(new Error('boom'));
    expect(await loadPagefind('/', () => Promise.resolve(api))).toBeUndefined();
  });
});

describe('excerptParts', () => {
  it('separa el texto de los fragmentos resaltados', () => {
    expect(excerptParts('un <mark>buen</mark> día')).toEqual([
      { text: 'un ', mark: false },
      { text: 'buen', mark: true },
      { text: ' día', mark: false },
    ]);
  });

  it('descodifica las entidades que Pagefind escapa y no deja pasar otras etiquetas', () => {
    expect(excerptParts('a &lt;b&gt; &amp; <mark>c</mark>')).toEqual([
      { text: 'a <b> & ', mark: false },
      { text: 'c', mark: true },
    ]);
    expect(excerptParts('<img src=x onerror=1>hola')).toEqual([
      { text: '<img src=x onerror=1>hola', mark: false },
    ]);
  });

  it('es vacío con un texto vacío', () => {
    expect(excerptParts('')).toEqual([]);
  });
});

describe('runSearch', () => {
  const docs = [
    { url: '/repo/es/guia/', title: 'Guía', excerpt: 'la <mark>guía</mark>' },
    { url: '/repo/es/api/', title: '', excerpt: 'api' },
    { url: '/repo/es/x/', title: 'X', excerpt: 'x' },
  ];

  it('devuelve url, título y extracto de cada resultado, con límite', async () => {
    const hits = await runSearch(fakeApi(docs), 'guía', 2);
    expect(hits).toEqual([
      { url: '/repo/es/guia/', title: 'Guía', excerpt: 'la <mark>guía</mark>' },
      { url: '/repo/es/api/', title: '/repo/es/api/', excerpt: 'api' },
    ]);
  });

  it('una consulta en blanco no busca', async () => {
    const api = fakeApi(docs);
    expect(await runSearch(api, '   ', 5)).toEqual([]);
    expect(api.search).not.toHaveBeenCalled();
  });
});

describe('initSearch', () => {
  const markup = `
    <div data-search data-base-url="/repo/" data-requires-build="Disponible tras el build" data-no-results="Sin resultados">
      <input data-search-input type="search">
      <p data-search-status role="status"></p>
      <ul data-search-results></ul>
    </div>`;

  function setup(importer: (url: string) => Promise<unknown>) {
    const { document } = parseHTML(`<!doctype html><html><body>${markup}</body></html>`);
    const root = document.querySelector<HTMLElement>('[data-search]')!;
    initSearch(root, { importer, debounceMs: 0, schedule: (cb) => cb() });
    const input = document.querySelector<HTMLInputElement>('[data-search-input]')!;
    const status = document.querySelector('[data-search-status]')!;
    const items = () => [...document.querySelectorAll('[data-search-results] li')];
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const type = async (value: string) => {
      input.value = value;
      input.dispatchEvent(new document.defaultView!.Event('input'));
      await flush();
    };
    const event = (type: string, props: object = {}) =>
      Object.assign(
        new document.defaultView!.Event(type, { cancelable: true, bubbles: true }),
        props,
      );
    return { document, root, input, status, items, type, flush, event };
  }

  it('no carga Pagefind hasta que se usa', () => {
    const importer = vi.fn(() => Promise.resolve(fakeApi()));
    setup(importer);
    expect(importer).not.toHaveBeenCalled();
  });

  it('muestra los resultados como enlaces con título y extracto resaltado', async () => {
    const api = fakeApi([
      { url: '/repo/es/guia/', title: 'Guía', excerpt: 'la <mark>guía</mark>' },
    ]);
    const importer = vi.fn(() => Promise.resolve(api));
    const { items, type, root } = setup(importer);
    await type('guía');
    expect(importer).toHaveBeenCalledWith('/repo/pagefind/pagefind.js');
    const [item] = items();
    const link = item!.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/repo/es/guia/');
    expect(link.textContent).toContain('Guía');
    expect(item!.querySelector('mark')!.textContent).toBe('guía');
    expect(root.getAttribute('data-state')).toBe('results');
  });

  it('con la API ausente explica que el índice existe tras el build, sin lanzar', async () => {
    const { status, items, type, root } = setup(() => Promise.reject(new Error('404')));
    await type('algo');
    expect(status.textContent).toBe('Disponible tras el build');
    expect(items()).toHaveLength(0);
    expect(root.getAttribute('data-state')).toBe('unavailable');
  });

  it('sin coincidencias lo dice', async () => {
    const { status, items, type, root } = setup(() => Promise.resolve(fakeApi([])));
    await type('nada');
    expect(items()).toHaveLength(0);
    expect(status.textContent).toBe('Sin resultados');
    expect(root.getAttribute('data-state')).toBe('empty');
  });

  it('el mensaje de sin resultados interpola la consulta ({query}) como texto', async () => {
    const { status, root, type } = setup(() => Promise.resolve(fakeApi([])));
    root.setAttribute('data-no-results', 'Sin resultados para «{query}»');
    await type('<b>x</b>');
    expect(status.textContent).toBe('Sin resultados para «<b>x</b>»');
  });

  it('vaciar la consulta limpia resultados y estado', async () => {
    const api = fakeApi([{ url: '/a/', title: 'A', excerpt: 'a' }]);
    const { status, items, type, root } = setup(() => Promise.resolve(api));
    await type('a');
    expect(items()).toHaveLength(1);
    await type('');
    expect(items()).toHaveLength(0);
    expect(status.textContent).toBe('');
    expect(root.hasAttribute('data-state')).toBe(false);
  });

  it('una respuesta tardía de una consulta anterior no pisa la actual', async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    const api: PagefindApi = {
      options: () => Promise.resolve(),
      search: async (q: string) => {
        if (q === 'lenta') await slow;
        return {
          results: [
            { data: () => Promise.resolve({ url: `/${q}/`, meta: { title: q }, excerpt: q }) },
          ],
        };
      },
    };
    const { items, type, flush } = setup(() => Promise.resolve(api));
    await type('lenta');
    await type('rapida');
    release();
    await flush();
    expect(items().map((li) => li.querySelector('a')!.getAttribute('href'))).toEqual(['/rapida/']);
  });

  it('Escape vacía la búsqueda; las flechas recorren los resultados con el teclado', async () => {
    const api = fakeApi([
      { url: '/a/', title: 'A', excerpt: 'a' },
      { url: '/b/', title: 'B', excerpt: 'b' },
    ]);
    const { document, input, items, type, event } = setup(() => Promise.resolve(api));
    await type('x');
    const links = () => [...document.querySelectorAll<HTMLElement>('[data-search-results] a')];
    links().forEach((a) => (a.focus = vi.fn()));
    input.dispatchEvent(event('keydown', { key: 'ArrowDown' }));
    expect(links()[0]!.focus).toHaveBeenCalled();
    links()[0]!.dispatchEvent(event('keydown', { key: 'ArrowDown' }));
    expect(links()[1]!.focus).toHaveBeenCalled();
    input.focus = vi.fn();
    links()[0]!.dispatchEvent(event('keydown', { key: 'ArrowUp' }));
    expect(input.focus).toHaveBeenCalled();
    input.dispatchEvent(event('keydown', { key: 'Escape' }));
    expect(input.value).toBe('');
    expect(items()).toHaveLength(0);
  });

  it('no hace nada si faltan las piezas del control', () => {
    const { document } = parseHTML('<div data-search></div>');
    expect(() => initSearch(document.querySelector('[data-search]')!)).not.toThrow();
  });
});
