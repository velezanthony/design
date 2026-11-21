import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { initIndexPager, readState, stateUrl, visibleRange } from './index-pager';

const PARAMS = { perPage: 'por', page: 'pagina' };

describe('readState', () => {
  const options = [9, 18, 27];

  it('sin query: el tamaño de las rutas estáticas y la página 1', () => {
    expect(readState('', PARAMS, options, 9, 20)).toEqual({ perPage: 9, page: 1 });
  });

  it('lee `por` y `pagina` de la query', () => {
    expect(readState('?por=18&pagina=2', PARAMS, options, 9, 20)).toEqual({ perPage: 18, page: 2 });
  });

  it('un tamaño que no es una opción vuelve al de la config; la página se acota', () => {
    expect(readState('?por=7', PARAMS, options, 9, 20)).toEqual({ perPage: 9, page: 1 });
    expect(readState('?por=18&pagina=9', PARAMS, options, 9, 20)).toEqual({ perPage: 18, page: 2 });
    expect(readState('?pagina=-3', PARAMS, options, 9, 20)).toEqual({ perPage: 9, page: 1 });
  });
});

describe('stateUrl', () => {
  it('el tamaño de la config en la página 1 es la URL limpia', () => {
    expect(stateUrl('/a/', { perPage: 9, page: 1 }, 9, PARAMS)).toBe('/a/');
  });

  it('otro tamaño o otra página van en la query', () => {
    expect(stateUrl('/a/', { perPage: 18, page: 1 }, 9, PARAMS)).toBe('/a/?por=18');
    expect(stateUrl('/a/', { perPage: 18, page: 2 }, 9, PARAMS)).toBe('/a/?por=18&pagina=2');
    expect(stateUrl('/a/', { perPage: 9, page: 2 }, 9, PARAMS)).toBe('/a/?por=9&pagina=2');
  });
});

describe('visibleRange', () => {
  it('desde y hasta (contando desde 1), sin pasarse del total', () => {
    expect(visibleRange({ perPage: 18, page: 1 }, 20)).toEqual({ from: 1, to: 18 });
    expect(visibleRange({ perPage: 18, page: 2 }, 20)).toEqual({ from: 19, to: 20 });
  });
});

/* Un listado como el que pinta `IndexListing` en la página 1: 20 entradas, de 9 en 9 sin JavaScript. */
function pageOne(total = 20) {
  const items = Array.from(
    { length: total },
    (_item, index) => `<li data-index-item${index >= 9 ? ' hidden' : ''}>${index + 1}</li>`,
  ).join('');
  const pagers = [
    [9, 3],
    [18, 2],
    [27, 1],
  ]
    .flatMap(([per, pages]) =>
      Array.from({ length: pages! }, (_item, index) => {
        const page = index + 1;
        const href =
          per === 9
            ? page === 1
              ? '/a/'
              : `/a/${page}/`
            : `/a/?por=${per}${page === 1 ? '' : `&pagina=${page}`}`;
        const hidden = per === 9 && page === 1 ? '' : ' hidden';
        return `<nav data-index-pagination data-per="${per}" data-page="${page}"${hidden}><a href="${href}">${page}</a><a data-next href="${per === 18 ? '/a/?por=18&pagina=2' : '/a/2/'}">next</a></nav>`;
      }),
    )
    .join('');
  return `<div data-index-listing tabindex="-1" data-index-pager data-per-page="9" data-options="9,18,27" data-total="${total}" data-all="true" data-folder="/a/" data-key="/a/" data-param-per="por" data-param-page="pagina" data-showing="Mostrando {from}–{to} de {total}">
    <div data-index-per-page-field hidden><select data-index-per-page><option value="9">9</option><option value="18">18</option><option value="27">27</option></select></div>
    <p data-index-status aria-live="polite"></p>
    <ul>${items}</ul>${pagers}</div>`;
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => void values.set(key, value)),
  } as unknown as Storage & { setItem: ReturnType<typeof vi.fn> };
}

function setup(options: { search?: string; storage?: Storage; body?: string } = {}) {
  const { document, window } = parseHTML(
    `<!doctype html><html><body>${options.body ?? pageOne()}</body></html>`,
  );
  const location = {
    href: `https://x.dev/a/${options.search ?? ''}`,
    pathname: '/a/',
    search: options.search ?? '',
    assign: vi.fn(),
  };
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  const history = {
    pushState: vi.fn((_state: unknown, _title: string, url: string) => navigate(url)),
    replaceState: vi.fn((_state: unknown, _title: string, url: string) => navigate(url)),
  };
  function navigate(url: string) {
    const target = new URL(url, location.href);
    Object.assign(location, {
      href: target.href,
      pathname: target.pathname,
      search: target.search,
    });
  }
  const browserWindow = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      (listeners[type] ??= []).push(listener);
    },
  };
  initIndexPager(document, { storage: options.storage, location, history, browserWindow });
  const root = document.querySelector<HTMLElement>('[data-index-pager]')!;
  const select = root.querySelector<HTMLSelectElement>('select')!;
  function visible() {
    return [...root.querySelectorAll<HTMLElement>('[data-index-item]')]
      .filter((item) => !item.hasAttribute('hidden'))
      .map((item) => Number(item.textContent));
  }
  function pager() {
    const shown = [...root.querySelectorAll<HTMLElement>('[data-index-pagination]')].filter(
      (nav) => !nav.hasAttribute('hidden'),
    );
    return shown.map((nav) => `${nav.dataset.per}/${nav.dataset.page}`);
  }
  function choose(value: string) {
    for (const option of select.querySelectorAll('option')) {
      option.removeAttribute('selected');
      if (option.value === value) option.selected = true;
    }
    select.dispatchEvent(new window.Event('change'));
  }
  function popTo(url: string) {
    navigate(url);
    for (const listener of listeners.popstate ?? []) listener({});
  }
  return { document, window, root, select, location, history, visible, pager, choose, popTo };
}

describe('initIndexPager: página 1', () => {
  it('con JavaScript se ve el selector, con el tamaño de la config elegido', () => {
    const { root, select, visible, pager } = setup();
    expect(root.querySelector('[data-index-per-page-field]')!.hasAttribute('hidden')).toBe(false);
    expect(select.value).toBe('9');
    expect(visible()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pager()).toEqual(['9/1']);
  });

  it('elegir 18 enseña 18, vuelve a la página 1, lo pone en la URL, lo recuerda y lo anuncia', () => {
    const storage = memoryStorage();
    const { root, choose, visible, pager, location, history } = setup({ storage });
    choose('18');
    expect(visible()).toHaveLength(18);
    expect(pager()).toEqual(['18/1']);
    expect(history.pushState).toHaveBeenCalledWith({}, '', '/a/?por=18');
    expect(location.search).toBe('?por=18');
    expect(storage.setItem).toHaveBeenCalledWith('docs:index-per-page:/a/', '18');
    expect(root.querySelector('[data-index-status]')!.textContent).toBe('Mostrando 1–18 de 20');
  });

  it('volver al tamaño de la config deja la URL limpia', () => {
    const { choose, history } = setup({ search: '?por=18' });
    choose('9');
    expect(history.pushState).toHaveBeenLastCalledWith({}, '', '/a/');
  });

  it('la query manda al cargar: `?por=18&pagina=2`', () => {
    const { select, visible, pager } = setup({ search: '?por=18&pagina=2' });
    expect(select.value).toBe('18');
    expect(visible()).toEqual([19, 20]);
    expect(pager()).toEqual(['18/2']);
  });

  it('sin query, lo recordado se aplica y se escribe en la URL sin añadir historial', () => {
    const storage = memoryStorage({ 'docs:index-per-page:/a/': '27' });
    const { visible, history } = setup({ storage });
    expect(visible()).toHaveLength(20);
    expect(history.replaceState).toHaveBeenCalledWith({}, '', '/a/?por=27');
    expect(history.pushState).not.toHaveBeenCalled();
  });

  it('un valor recordado que ya no es una opción se ignora; sin almacenamiento también funciona', () => {
    const storage = memoryStorage({ 'docs:index-per-page:/a/': '7' });
    expect(setup({ storage }).visible()).toHaveLength(9);
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    } as unknown as Storage;
    const { choose, visible } = setup({ storage: broken });
    choose('18');
    expect(visible()).toHaveLength(18);
  });

  it('un enlace del paginador con query cambia de página sin recargar, mueve el foco y lo anuncia', () => {
    const { root, window, history, visible, choose } = setup();
    const focus = vi.fn();
    root.focus = focus;
    choose('18');
    const next = root.querySelector<HTMLAnchorElement>(
      '[data-per="18"][data-page="1"] [data-next]',
    )!;
    const click = new window.Event('click', { bubbles: true, cancelable: true });
    next.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(history.pushState).toHaveBeenLastCalledWith({}, '', '/a/?por=18&pagina=2');
    expect(visible()).toEqual([19, 20]);
    expect(focus).toHaveBeenCalled();
    expect(root.querySelector('[data-index-status]')!.textContent).toBe('Mostrando 19–20 de 20');
  });

  it('un enlace a una ruta estática (el tamaño de la config) navega de verdad', () => {
    const { root, window } = setup();
    const next = root.querySelector<HTMLAnchorElement>(
      '[data-per="9"][data-page="1"] [data-next]',
    )!;
    const click = new window.Event('click', { bubbles: true, cancelable: true });
    next.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it('atrás y adelante vuelven al estado de cada URL', () => {
    const { choose, popTo, visible, select } = setup();
    choose('18');
    popTo('/a/');
    expect(select.value).toBe('9');
    expect(visible()).toHaveLength(9);
    popTo('/a/?por=27');
    expect(visible()).toHaveLength(20);
  });

  it('al cargar, el rango visible sigue al estado de la URL pero sin anunciarlo', () => {
    const { root } = setup({ search: '?por=18' });
    const status = root.querySelector('[data-index-status]')!;
    expect(status.textContent).toBe('Mostrando 1–18 de 20');
    // La región vuelve a ser `polite` para los cambios siguientes.
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('el cambio del rango al cargar se hace con la región en silencio', () => {
    const { document } = parseHTML(`<!doctype html><html><body>${pageOne()}</body></html>`);
    const status = document.querySelector('[data-index-status]')!;
    const seen: (string | null)[] = [];
    const descriptor =
      Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(Object.getPrototypeOf(status)),
        'textContent',
      ) ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(status), 'textContent');
    Object.defineProperty(status, 'textContent', {
      configurable: true,
      get: () => descriptor?.get?.call(status),
      set: (value: string) => {
        seen.push(status.getAttribute('aria-live'));
        descriptor?.set?.call(status, value);
      },
    });
    const location = {
      href: 'https://x.dev/a/?por=18',
      pathname: '/a/',
      search: '?por=18',
      assign: vi.fn(),
    };
    initIndexPager(document, { storage: undefined, location });
    expect(seen).toEqual([null]);
  });
});

describe('initIndexPager: páginas 2 y siguientes', () => {
  const body = pageOne()
    .replace('data-all="true"', 'data-all="false"')
    .replace(/<ul>[\s\S]*<\/ul>/, '<ul><li data-index-item>10</li></ul>');

  it('el selector, al cambiar, lleva a la carpeta con el tamaño elegido y lo recuerda', () => {
    const storage = memoryStorage();
    const { choose, location } = setup({ body, storage });
    choose('18');
    expect(location.assign).toHaveBeenCalledWith('/a/?por=18');
    expect(storage.setItem).toHaveBeenCalledWith('docs:index-per-page:/a/', '18');
    choose('9');
    expect(location.assign).toHaveBeenLastCalledWith('/a/');
  });

  it('no toca las entradas ni el paginador estáticos', () => {
    const { visible } = setup({ body });
    expect(visible()).toEqual([10]);
  });
});
