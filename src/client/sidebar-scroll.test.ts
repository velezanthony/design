import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import {
  initSidebarScroll,
  isVisible,
  parseScroll,
  sidebarScrollScript,
  targetScroll,
} from './sidebar-scroll';

describe('parseScroll', () => {
  it.each([
    ['0', 0],
    ['120', 120],
    ['87.5', 87.5],
  ])('lee %j como %d', (value, expected) => {
    expect(parseScroll(value)).toBe(expected);
  });

  it.each([null, undefined, '', 'abc', '-5', 'NaN', 'Infinity', '12px'])('ignora %j', (value) => {
    expect(parseScroll(value)).toBeUndefined();
  });
});

describe('isVisible', () => {
  const view = { top: 100, height: 300 };

  it('un item dentro del tramo visible lo es', () => {
    expect(isVisible({ top: 150, height: 30 }, view)).toBe(true);
    expect(isVisible({ top: 100, height: 30 }, view)).toBe(true);
    expect(isVisible({ top: 370, height: 30 }, view)).toBe(true);
  });

  it('uno por encima, por debajo o cortado por un borde no lo es', () => {
    expect(isVisible({ top: 50, height: 30 }, view)).toBe(false);
    expect(isVisible({ top: 400, height: 30 }, view)).toBe(false);
    expect(isVisible({ top: 90, height: 30 }, view)).toBe(false);
    expect(isVisible({ top: 380, height: 30 }, view)).toBe(false);
  });
});

describe('targetScroll', () => {
  const container = { height: 400 };
  const current = { top: 1000, height: 40 };

  it('con lo guardado y el enlace actual a la vista, devuelve lo guardado', () => {
    expect(targetScroll({ stored: 800, container, current })).toBe(800);
  });

  it('con lo guardado y sin enlace actual, devuelve lo guardado', () => {
    expect(targetScroll({ stored: 800, container, current: undefined })).toBe(800);
  });

  it('con lo guardado pero el enlace actual fuera, centra el enlace', () => {
    expect(targetScroll({ stored: 0, container, current })).toBe(1000 - (400 - 40) / 2);
  });

  it('sin nada guardado centra el enlace actual', () => {
    expect(targetScroll({ stored: undefined, container, current })).toBe(820);
  });

  it('nunca devuelve un desplazamiento negativo', () => {
    expect(targetScroll({ stored: undefined, container, current: { top: 20, height: 40 } })).toBe(
      0,
    );
  });

  it('sin nada guardado ni enlace actual no hay nada que aplicar', () => {
    expect(targetScroll({ stored: undefined, container, current: undefined })).toBeUndefined();
  });
});

const LG = '(min-width: 64rem)';
const memory = (initial: Record<string, string> = {}): Storage => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  } as Storage;
};
const blocked = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
} as unknown as Storage;

/** linkedom no calcula geometría: cada elemento la declara. */
const geometry = (el: Element, rect: { top: number; height: number }) => {
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ top: rect.top, height: rect.height, bottom: rect.top + rect.height }),
  });
};

const page = ({
  left = 'open',
  scrollTop = 0,
  current = true,
}: { left?: string; scrollTop?: number; current?: boolean } = {}) => {
  const { document } = parseHTML(
    `<!doctype html><html data-left="${left}"><body>
      <aside data-docs-sidebar-scroll>
        <a href="/a/">A</a>
        <a id="cur" href="/b/" ${current ? 'aria-current="page"' : ''}>B</a>
        <a id="other" href="/c/">C</a>
      </aside></body></html>`,
  );
  const box = document.querySelector('aside') as HTMLElement;
  /* La barra mide 400 y empieza en y=32; el enlace actual está a 1000 del inicio del contenido. */
  Object.defineProperty(box, 'clientHeight', { value: 400 });
  box.scrollTop = scrollTop;
  geometry(box, { top: 32, height: 400 });
  geometry(document.getElementById('cur')!, { top: 32 + 1000 - scrollTop, height: 40 });
  return { document, box };
};

describe('sidebarScrollScript', () => {
  const run = (
    doc: Document,
    session: Storage | 'throws',
    { wide = true }: { wide?: boolean } = {},
  ) =>
    new Function('document', 'sessionStorage', 'matchMedia', sidebarScrollScript())(
      doc,
      session === 'throws' ? blocked : session,
      (query: string) => ({ matches: query === LG && wide }),
    );

  it('restaura la posición guardada si el enlace actual sigue a la vista', () => {
    const { document, box } = page({ scrollTop: 0 });
    /* Con 700 de desplazamiento el enlace (1000) cae en 700..1100: visible. */
    run(document, memory({ 'docs:sidebar-scroll': '700' }));
    expect(box.scrollTop).toBe(700);
  });

  it('con una posición que dejaría fuera el enlace actual, lo centra', () => {
    const { document, box } = page();
    run(document, memory({ 'docs:sidebar-scroll': '0' }));
    expect(box.scrollTop).toBe(820);
  });

  it('sin nada guardado centra el enlace actual', () => {
    const { document, box } = page();
    run(document, memory());
    expect(box.scrollTop).toBe(820);
  });

  it('con el almacenamiento bloqueado no lanza y centra el enlace actual', () => {
    const { document, box } = page();
    expect(() => run(document, 'throws')).not.toThrow();
    expect(box.scrollTop).toBe(820);
  });

  it('sin almacenamiento (undefined) tampoco lanza', () => {
    const { document, box } = page();
    expect(() =>
      new Function('document', 'sessionStorage', 'matchMedia', sidebarScrollScript())(
        document,
        undefined,
        () => ({ matches: true }),
      ),
    ).not.toThrow();
    expect(box.scrollTop).toBe(820);
  });

  it('con un valor guardado roto, centra el enlace actual', () => {
    const { document, box } = page();
    run(document, memory({ 'docs:sidebar-scroll': 'basura' }));
    expect(box.scrollTop).toBe(820);
  });

  it('por debajo de lg no toca nada', () => {
    const { document, box } = page();
    run(document, memory({ 'docs:sidebar-scroll': '700' }), { wide: false });
    expect(box.scrollTop).toBe(0);
  });

  it('con el raíl plegado no toca nada', () => {
    const { document, box } = page({ left: 'collapsed' });
    run(document, memory({ 'docs:sidebar-scroll': '700' }));
    expect(box.scrollTop).toBe(0);
  });

  it('sin enlace actual restaura lo guardado', () => {
    const { document, box } = page({ current: false });
    run(document, memory({ 'docs:sidebar-scroll': '300' }));
    expect(box.scrollTop).toBe(300);
  });

  it('sin la barra lateral en la página no falla', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    expect(() => run(document, memory())).not.toThrow();
  });

  it('no declara variables globales (`var top` en un script clásico no se asigna)', () => {
    expect(sidebarScrollScript().trimStart().startsWith('(function')).toBe(true);
    expect(sidebarScrollScript()).not.toMatch(/var top\b/);
  });

  it('usa una clave propia del sitio de docs', () => {
    expect(sidebarScrollScript()).toContain('"docs:sidebar-scroll"');
  });
});

describe('initSidebarScroll', () => {
  const setup = ({
    storage = memory(),
    wide = true,
    left = 'open',
    scrollTop = 640,
  }: { storage?: Storage; wide?: boolean; left?: string; scrollTop?: number } = {}) => {
    const { document, box } = page({ left, scrollTop });
    const listeners = new Map<string, () => void>();
    const win = {
      addEventListener: vi.fn((type: string, cb: () => void) => void listeners.set(type, cb)),
    };
    initSidebarScroll({ doc: document, storage, win, rail: { matches: wide } });
    return { document, box, storage, listeners };
  };

  it('guarda la posición al salir de la página (pagehide)', () => {
    const { storage, listeners } = setup();
    listeners.get('pagehide')!();
    expect(storage.getItem('docs:sidebar-scroll')).toBe('640');
  });

  it('la guarda también al pulsar un enlace de la barra, antes de navegar', () => {
    const { document, storage } = setup();
    (document.getElementById('other') as HTMLElement).click();
    expect(storage.getItem('docs:sidebar-scroll')).toBe('640');
  });

  it('por debajo de lg no guarda', () => {
    const { storage, listeners } = setup({ wide: false });
    listeners.get('pagehide')!();
    expect(storage.getItem('docs:sidebar-scroll')).toBeNull();
  });

  it('con el raíl plegado no pisa lo guardado', () => {
    const { storage, listeners } = setup({
      left: 'collapsed',
      storage: memory({ 'docs:sidebar-scroll': '90' }),
    });
    listeners.get('pagehide')!();
    expect(storage.getItem('docs:sidebar-scroll')).toBe('90');
  });

  it('con el almacenamiento bloqueado no lanza', () => {
    const { document, listeners } = setup({ storage: blocked });
    expect(() => listeners.get('pagehide')!()).not.toThrow();
    expect(() => (document.getElementById('other') as HTMLElement).click()).not.toThrow();
  });

  it('sin barra lateral en la página no hace nada', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    const win = { addEventListener: vi.fn() };
    initSidebarScroll({ doc: document, storage: memory(), win, rail: { matches: true } });
    expect(win.addEventListener).not.toHaveBeenCalled();
  });
});
