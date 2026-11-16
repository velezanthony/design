import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import {
  initTheme,
  isDark,
  nextTheme,
  parseTheme,
  syncThemeColor,
  syncToggle,
  themeBootstrapScript,
} from './theme';

const colors = { light: '#fcfefe', dark: '#0e1111' };

const memory = (initial: Record<string, string> = {}): Storage => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  } as Storage;
};

const page = () =>
  parseHTML(
    '<!doctype html><html><head>' +
      '<meta name="theme-color" content="#fcfefe" media="(prefers-color-scheme: light)">' +
      '<meta name="theme-color" content="#0e1111" media="(prefers-color-scheme: dark)">' +
      '</head><body><button data-theme-toggle></button><button data-theme-toggle></button></body></html>',
  ).document;

describe('parseTheme', () => {
  it.each(['dark', 'light'])('acepta %s', (value) => {
    expect(parseTheme(value)).toBe(value);
  });

  it.each([null, '', 'Dark', 'system'])('ignora %j', (value) => {
    expect(parseTheme(value)).toBeUndefined();
  });
});

describe('isDark', () => {
  it('una elección explícita gana al sistema', () => {
    expect(isDark('dark', false)).toBe(true);
    expect(isDark('light', true)).toBe(false);
  });

  it('sin elección manda el sistema', () => {
    expect(isDark(undefined, true)).toBe(true);
    expect(isDark(undefined, false)).toBe(false);
  });
});

describe('nextTheme', () => {
  it('cambia al contrario de lo que se ve, elegido o no', () => {
    expect(nextTheme(undefined, true)).toBe('light');
    expect(nextTheme(undefined, false)).toBe('dark');
    expect(nextTheme('dark', false)).toBe('light');
  });
});

/* El botón enciende y apaga el modo oscuro: `aria-pressed` es si está encendido. */
describe('syncToggle', () => {
  const button = () => parseHTML('<button></button>').document.querySelector('button')!;

  it.each([true, false])('con modo oscuro %s', (dark) => {
    const b = button();
    syncToggle(b, dark);
    expect(b.getAttribute('aria-pressed')).toBe(String(dark));
  });
});

describe('syncThemeColor', () => {
  /* Cada etiqueta responde a la preferencia del sistema; una elección debe imponerse a ambas, o
     la barra del navegador conserva el color del sistema bajo una página del otro. */
  it('da a cada etiqueta theme-color el color elegido', () => {
    const document = page();
    syncThemeColor(document, '#0e1111');
    const contents = [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) =>
      meta.getAttribute('content'),
    );
    expect(contents).toEqual(['#0e1111', '#0e1111']);
  });
});

/* Se ejecuta en línea antes del pintado: sin él la página se pinta con el tema del sistema y
   luego salta. No puede importar nada, por eso es una cadena y se prueba ejecutándola. */
describe('themeBootstrapScript', () => {
  const run = (storage: Storage | 'throws') => {
    const document = page();
    const localStorage =
      storage === 'throws'
        ? ({
            getItem: () => {
              throw new DOMException('denied', 'SecurityError');
            },
          } as unknown as Storage)
        : storage;
    new Function('document', 'localStorage', themeBootstrapScript(colors))(document, localStorage);
    return document;
  };

  it('aplica el tema guardado y el color de la barra', () => {
    const document = run(memory({ theme: 'dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    const contents = [...document.querySelectorAll('meta[name="theme-color"]')].map((m) =>
      m.getAttribute('content'),
    );
    expect(contents).toEqual(['#0e1111', '#0e1111']);
  });

  it('aplica el claro igual', () => {
    expect(run(memory({ theme: 'light' })).documentElement.dataset.theme).toBe('light');
  });

  it.each(['', 'system', 'DARK'])('ignora un valor ajeno (%j)', (value) => {
    expect(run(memory({ theme: value })).documentElement.dataset.theme).toBeUndefined();
  });

  it('sin nada guardado deja mandar al sistema', () => {
    expect(run(memory()).documentElement.dataset.theme).toBeUndefined();
  });

  it('con el almacenamiento bloqueado no rompe y deja mandar al sistema', () => {
    expect(run('throws').documentElement.dataset.theme).toBeUndefined();
  });

  it('usa la clave compartida con el portfolio', () => {
    expect(themeBootstrapScript(colors)).toContain('getItem("theme")');
  });
});

describe('initTheme', () => {
  const setup = (opts: { storage?: Storage; systemDark?: boolean; theme?: string } = {}) => {
    const document = page();
    if (opts.theme) document.documentElement.dataset.theme = opts.theme;
    const listeners: (() => void)[] = [];
    const system = {
      matches: opts.systemDark ?? false,
      addEventListener: (_: string, cb: () => void) => void listeners.push(cb),
    };
    const storage = opts.storage ?? memory();
    initTheme({ doc: document, storage, system, colors });
    const buttons = [...document.querySelectorAll('[data-theme-toggle]')];
    const click = (i = 0) => buttons[i]!.dispatchEvent(new document.defaultView!.Event('click'));
    return { document, storage, buttons, click, system, listeners };
  };

  it('refleja el tema del sistema en aria-pressed al arrancar', () => {
    const { buttons } = setup({ systemDark: true });
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true']);
  });

  it('al pulsar cambia el tema, la barra, lo guarda y sincroniza todos los botones', () => {
    const { document, storage, buttons, click } = setup({ systemDark: false });
    click(0);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(storage.getItem('theme')).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe(
      colors.dark,
    );
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true']);
    click(1);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(storage.getItem('theme')).toBe('light');
  });

  it('con el almacenamiento bloqueado cambia el tema igualmente', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    } as unknown as Storage;
    const { document, click } = setup({ storage: blocked });
    expect(() => click()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('sin elección, un cambio del sistema actualiza el botón', () => {
    const { buttons, system, listeners } = setup({ systemDark: false });
    system.matches = true;
    for (const cb of listeners) cb();
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('no hace nada en una página sin botón', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    const spy = vi.fn();
    expect(() =>
      initTheme({
        doc: document,
        storage: memory(),
        system: { matches: false, addEventListener: spy },
        colors,
      }),
    ).not.toThrow();
  });
});
