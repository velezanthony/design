import { describe, expect, it } from 'vitest';

import { bootBase, bootDocs } from './boot';
import { content, env } from '../boot/fixtures/env';

describe('bootBase', () => {
  it('cablea el tema: el selector toma su estado', () => {
    const bootEnv = env('<button data-theme-toggle aria-pressed="x"></button>');
    bootBase(bootEnv);
    expect(
      bootEnv.htmlDocument.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('el tema solo lo cablea bootBase: bootDocs lo deja como está', () => {
    const bootEnv = env('<button data-theme-toggle aria-pressed="x"></button>');
    bootDocs(bootEnv);
    expect(
      bootEnv.htmlDocument.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed'),
    ).toBe('x');
  });

  it('sin banner ni selector no hace nada (ni falla)', () => {
    expect(() => bootBase(env(''))).not.toThrow();
  });
});

describe('bootDocs', () => {
  it('pone el año del visitante donde está marcado', () => {
    const bootEnv = env('<span data-current-year>1999</span>');
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('[data-current-year]')!.textContent).toBe(
      String(new Date().getFullYear()),
    );
  });

  it('cablea los botones de plegado y de ancho', () => {
    const bootEnv = env(
      `<button data-layout-toggle="left" aria-controls="nav" data-collapse-label="Plegar" data-expand-label="Desplegar"></button><div id="nav"></div><button data-layout-width="full"></button>`,
    );
    bootDocs(bootEnv);
    (bootEnv.htmlDocument.querySelector('[data-layout-toggle]') as HTMLElement).click();
    expect(bootEnv.htmlDocument.documentElement.dataset.left).toBe('collapsed');
    expect(bootEnv.htmlDocument.getElementById('nav')!.hasAttribute('inert')).toBe(true);
    (bootEnv.htmlDocument.querySelector('[data-layout-width]') as HTMLElement).click();
    expect(bootEnv.htmlDocument.documentElement.dataset.width).toBe('full');
  });

  it('no arranca el panel SEO: su JS solo va en las pantallas del panel', () => {
    const bootEnv = env('<button data-report-open="site" hidden>IA</button>');
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(
      true,
    );
  });

  it('sin controles no hace nada (ni falla)', () => {
    expect(() => bootDocs(env('<p>x</p>'))).not.toThrow();
  });

  it('no cablea el contenido: de eso se encarga bootArticle desde el propio Article', () => {
    const bootEnv = env(content);
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('button.docs-copy')).toBeNull();
    expect(bootEnv.htmlDocument.querySelector('a.heading-anchor')).toBeNull();
  });
});

describe('bootDocs: desplazamiento de la barra lateral', () => {
  it('guarda la posición de la barra al salir de la página', () => {
    const listeners = new Map<string, () => void>();
    const session = {
      items: new Map<string, string>(),
      getItem(key: string) {
        return this.items.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.items.set(key, value);
      },
    };
    const bootEnv = env('<aside data-docs-sidebar-scroll></aside>', {
      session: session as unknown as Storage,
      browserWindow: {
        addEventListener: (type: string, callback: () => void) =>
          void listeners.set(type, callback),
      } as never,
    });
    (bootEnv.htmlDocument.querySelector('aside') as HTMLElement).scrollTop = 123;
    bootDocs(bootEnv);
    listeners.get('pagehide')!();
    expect(session.items.get('docs:sidebar-scroll')).toBe('123');
  });
});
