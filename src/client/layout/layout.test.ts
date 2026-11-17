import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import {
  initLayout,
  layoutBootstrapScript,
  parseLayout,
  serializeLayout,
  togglePanel,
  withWidth,
  type LayoutState,
} from './layout';
import { LAYOUT_KEY } from '../preferences/storage';

const defaults: LayoutState = { left: 'open', right: 'open', width: 'reading' };

const memory = (initial: Record<string, string> = {}): Storage => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  } as Storage;
};

describe('parseLayout', () => {
  it('sin nada guardado devuelve los valores por defecto', () => {
    expect(parseLayout(null, defaults)).toEqual(defaults);
  });

  it('lee un estado válido', () => {
    const raw = JSON.stringify({ left: 'collapsed', right: 'open', width: 'full' });
    expect(parseLayout(raw, defaults)).toEqual({ left: 'collapsed', right: 'open', width: 'full' });
  });

  /* Un valor roto no tumba el resto: cada campo cae a su valor por defecto por separado. */
  it('un campo desconocido o de otro tipo cae a su valor por defecto', () => {
    const raw = JSON.stringify({ left: 'sideways', right: 'collapsed', width: 3 });
    expect(parseLayout(raw, defaults)).toEqual({
      left: 'open',
      right: 'collapsed',
      width: 'reading',
    });
  });

  it.each(['', '{', 'null', '[]', '"collapsed"', '42', 'undefined'])(
    'tolera la basura %j',
    (raw) => {
      expect(parseLayout(raw, defaults)).toEqual(defaults);
    },
  );

  it('los valores por defecto de la config mandan donde no hay nada guardado', () => {
    const custom: LayoutState = { left: 'collapsed', right: 'collapsed', width: 'full' };
    expect(parseLayout(JSON.stringify({ right: 'open' }), custom)).toEqual({
      left: 'collapsed',
      right: 'open',
      width: 'full',
    });
  });
});

describe('serializeLayout', () => {
  it('ida y vuelta sin pérdida', () => {
    const state: LayoutState = { left: 'collapsed', right: 'open', width: 'full' };
    expect(parseLayout(serializeLayout(state), defaults)).toEqual(state);
  });
});

describe('togglePanel / withWidth', () => {
  it('pliega y despliega un lado sin tocar el otro', () => {
    const folded = togglePanel(defaults, 'left');
    expect(folded).toEqual({ left: 'collapsed', right: 'open', width: 'reading' });
    expect(togglePanel(folded, 'left')).toEqual(defaults);
    expect(togglePanel(defaults, 'right').right).toBe('collapsed');
  });

  it('no muta el estado de entrada', () => {
    const before = { ...defaults };
    togglePanel(defaults, 'left');
    withWidth(defaults, 'full');
    expect(defaults).toEqual(before);
  });

  it('cambia el ancho', () => {
    expect(withWidth(defaults, 'full').width).toBe('full');
  });
});

const page = (attrs = 'data-left="open" data-right="open" data-width="reading"') =>
  parseHTML(`<!doctype html><html ${attrs}><body>
    <button data-layout-toggle="left" aria-controls="nav-panel" aria-expanded="true"
      data-collapse-label="Collapse navigation" data-expand-label="Expand navigation"></button>
    <div id="nav-panel"></div>
    <button data-layout-toggle="right" aria-controls="toc-panel" aria-expanded="true"
      data-collapse-label="Collapse index" data-expand-label="Expand index"></button>
    <div id="toc-panel"></div>
    <button data-layout-width="reading" aria-pressed="true"></button>
    <button data-layout-width="full" aria-pressed="false"></button>
  </body></html>`).document;

const click = (el: Element | null) => (el as HTMLElement).click();
const stored = (storage: Storage) =>
  JSON.parse(storage.getItem(LAYOUT_KEY) ?? 'null') as LayoutState | null;

describe('initLayout', () => {
  it('sincroniza aria y inert con el estado que ya trae <html>', () => {
    const doc = page('data-left="collapsed" data-right="open" data-width="full"');
    initLayout({ doc, storage: memory() });
    const left = doc.querySelector('[data-layout-toggle="left"]')!;
    expect(left.getAttribute('aria-expanded')).toBe('false');
    expect(left.getAttribute('aria-label')).toBe('Expand navigation');
    expect(doc.getElementById('nav-panel')!.hasAttribute('inert')).toBe(true);
    const right = doc.querySelector('[data-layout-toggle="right"]')!;
    expect(right.getAttribute('aria-expanded')).toBe('true');
    expect(right.getAttribute('aria-label')).toBe('Collapse index');
    expect(doc.getElementById('toc-panel')!.hasAttribute('inert')).toBe(false);
    expect(doc.querySelector('[data-layout-width="full"]')!.getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(doc.querySelector('[data-layout-width="reading"]')!.getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('pulsar el botón pliega el lado: atributo, aria, inert y almacenamiento', () => {
    const doc = page();
    const storage = memory();
    initLayout({ doc, storage });
    click(doc.querySelector('[data-layout-toggle="left"]'));

    const root = doc.documentElement;
    expect(root.dataset.left).toBe('collapsed');
    expect(root.dataset.right).toBe('open');
    const button = doc.querySelector('[data-layout-toggle="left"]')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Expand navigation');
    expect(doc.getElementById('nav-panel')!.hasAttribute('inert')).toBe(true);
    expect(stored(storage)).toEqual({ left: 'collapsed', right: 'open', width: 'reading' });
  });

  it('por debajo de lg no hay raíl: aunque el estado guardado esté plegado, el panel no es inert', () => {
    const doc = page('data-left="collapsed" data-right="collapsed" data-width="reading"');
    const listeners: (() => void)[] = [];
    const rail = {
      matches: false,
      addEventListener: (_: 'change', fn: () => void) => listeners.push(fn),
    };
    initLayout({ doc, storage: memory(), rail });
    // En móvil el lateral es el «Menú»: sus enlaces tienen que poder pulsarse.
    expect(doc.getElementById('nav-panel')!.hasAttribute('inert')).toBe(false);
    expect(doc.getElementById('toc-panel')!.hasAttribute('inert')).toBe(false);

    // Al ensanchar la ventana hasta lg el raíl aparece y el panel plegado vuelve a ser inert.
    rail.matches = true;
    listeners.forEach((fn) => fn());
    expect(doc.getElementById('nav-panel')!.hasAttribute('inert')).toBe(true);
  });

  it('pulsarlo otra vez lo despliega y quita inert', () => {
    const doc = page();
    initLayout({ doc, storage: memory() });
    const button = doc.querySelector('[data-layout-toggle="right"]')!;
    click(button);
    click(button);
    expect(doc.documentElement.dataset.right).toBe('open');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Collapse index');
    expect(doc.getElementById('toc-panel')!.hasAttribute('inert')).toBe(false);
  });

  it('los botones de ancho cambian data-width y aria-pressed y lo guardan', () => {
    const doc = page();
    const storage = memory();
    initLayout({ doc, storage });
    click(doc.querySelector('[data-layout-width="full"]'));
    expect(doc.documentElement.dataset.width).toBe('full');
    expect(doc.querySelector('[data-layout-width="full"]')!.getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(doc.querySelector('[data-layout-width="reading"]')!.getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(stored(storage)!.width).toBe('full');
  });

  it('con el almacenamiento bloqueado sigue funcionando', () => {
    const doc = page();
    initLayout({ doc, storage: undefined });
    click(doc.querySelector('[data-layout-toggle="left"]'));
    expect(doc.documentElement.dataset.left).toBe('collapsed');
  });

  it('con un atributo corrupto en <html> usa los valores por defecto', () => {
    const doc = page('data-left="nope" data-width="huge"');
    initLayout({ doc, storage: memory() });
    expect(doc.querySelector('[data-layout-toggle="left"]')!.getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('sin controles en la página (toggles: false) no hace nada ni guarda', () => {
    const { document } = parseHTML(
      '<!doctype html><html data-left="collapsed"><body></body></html>',
    );
    const storage = memory({ [LAYOUT_KEY]: JSON.stringify({ left: 'open' }) });
    initLayout({ doc: document, storage });
    expect(document.documentElement.dataset.left).toBe('collapsed');
    expect(stored(storage)).toEqual({ left: 'open' });
  });
});

describe('layoutBootstrapScript', () => {
  const run = (script: string, saved?: string) => {
    const { document } = parseHTML(
      '<!doctype html><html data-left="open" data-right="open" data-width="reading"><body></body></html>',
    );
    const storage = memory(saved === undefined ? {} : { [LAYOUT_KEY]: saved });
    new Function('document', 'localStorage', script)(document, storage);
    return document.documentElement;
  };

  it('aplica el estado guardado antes del primer pintado', () => {
    const root = run(
      layoutBootstrapScript({ toggles: true }),
      JSON.stringify({ left: 'collapsed', right: 'collapsed', width: 'full' }),
    );
    expect(root.dataset.left).toBe('collapsed');
    expect(root.dataset.right).toBe('collapsed');
    expect(root.dataset.width).toBe('full');
  });

  it('la clave del script es la del módulo de almacenamiento', () => {
    expect(layoutBootstrapScript({ toggles: true })).toContain(JSON.stringify(LAYOUT_KEY));
  });

  it('ignora valores inválidos y deja lo que puso el servidor', () => {
    const root = run(
      layoutBootstrapScript({ toggles: true }),
      JSON.stringify({ left: 'x', width: 'full', right: 7 }),
    );
    expect(root.dataset.left).toBe('open');
    expect(root.dataset.right).toBe('open');
    expect(root.dataset.width).toBe('full');
  });

  it.each(['{', 'null', ''])('tolera JSON roto (%j) sin lanzar', (saved) => {
    expect(() => run(layoutBootstrapScript({ toggles: true }), saved)).not.toThrow();
  });

  it('sin nada guardado no toca nada', () => {
    const root = run(layoutBootstrapScript({ toggles: true }));
    expect(root.dataset.left).toBe('open');
  });

  it('con toggles: false no emite script: el estado guardado se ignora', () => {
    expect(layoutBootstrapScript({ toggles: false })).toBe('');
  });

  it('no lanza si el almacenamiento está bloqueado', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    const blocked = {
      getItem() {
        throw new Error('blocked');
      },
    };
    expect(() =>
      new Function('document', 'localStorage', layoutBootstrapScript({ toggles: true }))(
        document,
        blocked,
      ),
    ).not.toThrow();
  });
});
