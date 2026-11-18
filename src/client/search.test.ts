import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import {
  type PagefindApi,
  excerptParts,
  initSearch,
  initSearchShortcut,
  loadPagefind,
  normalizeBase,
  pagefindUrl,
  runSearch,
} from './search';

function fakeApi(
  docs: { url: string; title: string; excerpt: string }[] = [],
): PagefindApi & { options: ReturnType<typeof vi.fn>; search: ReturnType<typeof vi.fn> } {
  return {
    options: vi.fn(() => Promise.resolve()),
    search: vi.fn((query: string) =>
      Promise.resolve({
        results: query
          ? docs.map((doc) => ({
              data: () =>
                Promise.resolve({ url: doc.url, meta: { title: doc.title }, excerpt: doc.excerpt }),
            }))
          : [],
      }),
    ),
  };
}

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
    function importer() {
      return Promise.reject(new Error('404'));
    }
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
    function items() {
      return [...document.querySelectorAll('[data-search-results] li')];
    }
    function flush() {
      return new Promise((resolve) => setTimeout(resolve, 0));
    }
    async function type(value: string) {
      input.value = value;
      input.dispatchEvent(new document.defaultView!.Event('input'));
      await flush();
    }
    function event(type: string, props: object = {}) {
      return Object.assign(
        new document.defaultView!.Event(type, { cancelable: true, bubbles: true }),
        props,
      );
    }
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
      search: async (query: string) => {
        if (query === 'lenta') await slow;
        return {
          results: [
            {
              data: () =>
                Promise.resolve({ url: `/${query}/`, meta: { title: query }, excerpt: query }),
            },
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
    function links() {
      return [...document.querySelectorAll<HTMLElement>('[data-search-results] a')];
    }
    links().forEach((link) => (link.focus = vi.fn()));
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

describe('initSearchShortcut: anuncio del atajo', () => {
  it('marca cada buscador con data-shortcut: la pista «/» solo se muestra si el atajo funciona', () => {
    const { document } = parseHTML(
      '<!doctype html><html><body><div data-search><input data-search-input></div><div data-search><input data-search-input></div></body></html>',
    );
    const roots = [...document.querySelectorAll('[data-search]')];
    expect(roots.every((root) => !root.hasAttribute('data-shortcut'))).toBe(true);
    initSearchShortcut(document);
    expect(roots.every((root) => root.hasAttribute('data-shortcut'))).toBe(true);
  });
});

describe('initSearchShortcut', () => {
  function page(
    body = '<input data-search-input type="search"><input id="other"><textarea id="area"></textarea><div id="edit" contenteditable="true"></div><button id="btn">x</button>',
  ) {
    const { document } = parseHTML(`<!doctype html><html><body>${body}</body></html>`);
    initSearchShortcut(document);
    const input = document.querySelector<HTMLInputElement>('[data-search-input]');
    if (input) input.focus = vi.fn();
    function press(props: object = {}, target: Element = document.body) {
      const event = Object.assign(
        new document.defaultView!.Event('keydown', { cancelable: true, bubbles: true }),
        { key: '/', ...props },
      );
      target.dispatchEvent(event);
      return event;
    }
    return { document, input, press };
  }

  it('«/» enfoca el buscador y no escribe la barra en ningún sitio', () => {
    const { input, press } = page();
    const event = press();
    expect(input!.focus).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('también funciona desde un botón o con el foco en el cuerpo', () => {
    const { document, input, press } = page();
    press({}, document.querySelector('#btn')!);
    expect(input!.focus).toHaveBeenCalledTimes(1);
  });

  it('con Mayús funciona: en muchos teclados la barra es Mayús+7', () => {
    const { input, press } = page();
    press({ shiftKey: true });
    expect(input!.focus).toHaveBeenCalledTimes(1);
  });

  it.each(['#other', '#area', '#edit', '[data-search-input]'])(
    'se ignora mientras se escribe en %s',
    (selector) => {
      const { document, input, press } = page();
      const event = press({}, document.querySelector(selector)!);
      expect(input!.focus).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it.each(['ctrlKey', 'metaKey', 'altKey'])('se ignora con %s', (modifier) => {
    const { input, press } = page();
    const event = press({ [modifier]: true });
    expect(input!.focus).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('se ignora con otras teclas', () => {
    const { input, press } = page();
    press({ key: 'a' });
    expect(input!.focus).not.toHaveBeenCalled();
  });

  it('si otro manejador ya atendió la tecla, no la pisa', () => {
    const { document, input } = page();
    const event = Object.assign(
      new document.defaultView!.Event('keydown', { cancelable: true, bubbles: true }),
      { key: '/' },
    );
    event.preventDefault();
    document.body.dispatchEvent(event);
    expect(input!.focus).not.toHaveBeenCalled();
  });

  it('sin buscador en la página no hace nada y deja pasar la tecla', () => {
    const { press } = page('<p>nada</p>');
    expect(press().defaultPrevented).toBe(false);
  });
});
