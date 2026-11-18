import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { bootDocs, bootNotFound, type BootEnv } from './boot';

function env(html: string, extra: Partial<BootEnv> = {}): BootEnv {
  const { document } = parseHTML(
    `<!doctype html><html lang="en"><head></head><body>${html}</body></html>`,
  );
  return {
    htmlDocument: document,
    storage: undefined,
    system: { matches: false, addEventListener: vi.fn() },
    clipboard: { writeText: vi.fn(async () => {}) },
    hostname: 'x.dev',
    reload: vi.fn(),
    pathname: '/repo/guide/',
    ...extra,
  };
}

const content = `
  <button data-theme-toggle aria-pressed="false"></button>
  <main data-copy-label="Copiar" data-copied-label="Copiado" data-copy-failed-label="Error" data-anchor-label="Enlace a {title}" data-zoom-label="Ampliar: {alt}" data-zoom-close-label="Cerrar">
    <h2 id="a">Uno</h2>
    <div class="prose"><img src="/a.png" alt="Esquema" width="800" height="400"></div>
    <pre class="astro-code"><code>x</code></pre>
    <div class="docs-tabs"><div class="docs-tab-panel"><div class="docs-tab-label">A</div>a</div></div>
  </main>`;

describe('bootDocs', () => {
  it('cablea tema, pestañas, botón de copiar y anclas de encabezado', () => {
    const bootEnv = env(content);
    bootDocs(bootEnv);
    expect(
      bootEnv.htmlDocument.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed'),
    ).toBe('false');
    expect(bootEnv.htmlDocument.querySelector('.docs-tabs[data-enhanced]')).not.toBeNull();
    expect(bootEnv.htmlDocument.querySelector('button.docs-copy')!.textContent).toBe('Copiar');
    expect(bootEnv.htmlDocument.querySelector('a.heading-anchor')!.getAttribute('aria-label')).toBe(
      'Enlace a Uno',
    );
  });

  it('pone el año del visitante donde está marcado', () => {
    const bootEnv = env('<span data-current-year>1999</span>');
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('[data-current-year]')!.textContent).toBe(
      String(new Date().getFullYear()),
    );
  });

  it('hace ampliables las imágenes del contenido, con los textos de <main>', () => {
    const bootEnv = env(content);
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('button.docs-zoom')!.getAttribute('aria-label')).toBe(
      'Ampliar: Esquema',
    );
    expect(bootEnv.htmlDocument.querySelector('.docs-zoom-close')!.getAttribute('aria-label')).toBe(
      'Cerrar',
    );
  });

  it('sin los textos del zoom no toca las imágenes', () => {
    const bootEnv = env(content.replace(/ data-zoom-label="[^"]*"/, ''));
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('button.docs-zoom')).toBeNull();
  });

  describe('diagramas de Mermaid', () => {
    const diagram = `<main data-diagram-label="Diagrama" data-copy-label="Copiar" data-copied-label="Copiado" data-copy-failed-label="Error" data-diagram-expand-label="Pantalla completa" data-diagram-zoom-in-label="Acercar" data-diagram-zoom-out-label="Alejar" data-diagram-fit-label="Ajustar" data-zoom-close-label="Cerrar"><div class="docs-mermaid" data-mermaid><pre class="astro-code" data-language="mermaid"><code>A--&gt;B</code></pre></div></main>`;
    function mermaid() {
      return {
        importer: vi.fn(async () => ({
          default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg></svg>' })) },
        })),
        readToken: () => '#fff',
      };
    }

    it('los dibuja con la etiqueta de <main>', async () => {
      const fakeMermaid = mermaid();
      const bootEnv = env(diagram, { mermaid: fakeMermaid });
      bootDocs(bootEnv);
      await vi.waitFor(() =>
        expect(
          bootEnv.htmlDocument.querySelector('.docs-mermaid-figure')!.getAttribute('aria-label'),
        ).toBe('Diagrama'),
      );
    });

    it('cada diagrama lleva copiar y pantalla completa, con los textos de <main>', async () => {
      const bootEnv = env(diagram, { mermaid: mermaid() });
      bootDocs(bootEnv);
      await vi.waitFor(() =>
        expect(bootEnv.htmlDocument.querySelector('.docs-expand')).not.toBeNull(),
      );
      const frame = bootEnv.htmlDocument.querySelector('.docs-mermaid .docs-code')!;
      expect(frame.querySelector('button.docs-copy')!.getAttribute('aria-label')).toBe('Copiar');
      expect(frame.querySelector('button.docs-expand')!.getAttribute('aria-label')).toBe(
        'Pantalla completa',
      );
      const labels = [
        ...bootEnv.htmlDocument.querySelectorAll('dialog.docs-diagram-dialog button'),
      ].map((button) => button.getAttribute('aria-label'));
      expect(labels).toEqual(['Alejar', 'Acercar', 'Ajustar', 'Cerrar']);
    });

    it('sin los textos del visor se dibuja igual pero sin botón de pantalla completa', async () => {
      const bootEnv = env(diagram.replace(/ data-diagram-expand-label="[^"]*"/, ''), {
        mermaid: mermaid(),
      });
      bootDocs(bootEnv);
      await vi.waitFor(() =>
        expect(bootEnv.htmlDocument.querySelector('.docs-mermaid-figure')).not.toBeNull(),
      );
      expect(bootEnv.htmlDocument.querySelector('.docs-expand')).toBeNull();
      expect(bootEnv.htmlDocument.querySelector('dialog')).toBeNull();
    });

    it('el código de diagramas no va en el script de todas las páginas: se carga solo si hay uno', () => {
      const source = readFileSync(new URL('./boot.ts', import.meta.url), 'utf8');
      expect(source).not.toMatch(/^import \{[^}]*\} from '[^']*client\/diagrams\/mermaid';$/m);
      expect(source).toContain("import('../../client/diagrams/mermaid')");
    });

    it('en una página sin diagramas no descarga mermaid', () => {
      const fakeMermaid = mermaid();
      bootDocs(env(content, { mermaid: fakeMermaid }));
      expect(fakeMermaid.importer).not.toHaveBeenCalled();
    });
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

  it('sin <main> ni controles no hace nada (ni falla)', () => {
    expect(() => bootDocs(env('<p>x</p>'))).not.toThrow();
  });

  it('no arranca el panel SEO: su JS solo va en las pantallas del panel', () => {
    const bootEnv = env('<button data-report-open="site" hidden>IA</button>');
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(
      true,
    );
  });

  it('sin portapapeles no añade el botón de copiar', () => {
    const bootEnv = env(content, { clipboard: undefined });
    bootDocs(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('button.docs-copy')).toBeNull();
  });
});

describe('bootNotFound', () => {
  function page(pathname: string) {
    return env(
      `<main>EN</main>
       <template data-locale="es" data-title="Perdida"><main>ES</main></template>`,
      { pathname },
    );
  }
  function prepare(bootEnv: BootEnv) {
    const root = bootEnv.htmlDocument.documentElement;
    root.setAttribute('data-nf-base', '/repo/');
    root.setAttribute('data-nf-locales', 'en,es');
    root.setAttribute('data-nf-default', 'en');
    root.classList.add('nf-pending');
    return bootEnv;
  }

  it('sustituye el cuerpo según la URL pedida (localeFromPath con base)', () => {
    const bootEnv = prepare(page('/repo/es/no-existe/'));
    bootNotFound(bootEnv);
    expect(bootEnv.htmlDocument.documentElement.getAttribute('lang')).toBe('es');
    expect(bootEnv.htmlDocument.body.querySelector('main')!.textContent).toBe('ES');
    expect(bootEnv.htmlDocument.title).toBe('Perdida');
  });

  it('una ruta del idioma por defecto deja el cuerpo y retira nf-pending', () => {
    const bootEnv = prepare(page('/repo/otra/'));
    bootNotFound(bootEnv);
    expect(bootEnv.htmlDocument.documentElement.getAttribute('lang')).toBe('en');
    expect(bootEnv.htmlDocument.body.querySelector('main')!.textContent).toBe('EN');
    expect(bootEnv.htmlDocument.documentElement.classList.contains('nf-pending')).toBe(false);
  });

  it('segmento completo: /repo/esx/ no es es', () => {
    const bootEnv = prepare(page('/repo/esx/a'));
    bootNotFound(bootEnv);
    expect(bootEnv.htmlDocument.documentElement.getAttribute('lang')).toBe('en');
  });

  it('tras sustituir, los controles del cuerpo nuevo quedan cableados', () => {
    const bootEnv = prepare(
      env(
        `<main>EN</main><template data-locale="es" data-title="P"><button data-theme-toggle aria-pressed="x"></button><main>ES</main></template>`,
        { pathname: '/repo/es/x' },
      ),
    );
    bootNotFound(bootEnv);
    expect(
      bootEnv.htmlDocument.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed'),
    ).toBe('false');
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
