import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { bootDocs, bootNotFound, type BootEnv } from './boot';

const env = (html: string, extra: Partial<BootEnv> = {}): BootEnv => {
  const { document } = parseHTML(
    `<!doctype html><html lang="en"><head></head><body>${html}</body></html>`,
  );
  return {
    doc: document,
    storage: undefined,
    system: { matches: false, addEventListener: vi.fn() },
    clipboard: { writeText: vi.fn(async () => {}) },
    hostname: 'x.dev',
    reload: vi.fn(),
    pathname: '/repo/guide/',
    ...extra,
  };
};

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
    const e = env(content);
    bootDocs(e);
    expect(e.doc.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed')).toBe('false');
    expect(e.doc.querySelector('.docs-tabs[data-enhanced]')).not.toBeNull();
    expect(e.doc.querySelector('button.docs-copy')!.textContent).toBe('Copiar');
    expect(e.doc.querySelector('a.heading-anchor')!.getAttribute('aria-label')).toBe(
      'Enlace a Uno',
    );
  });

  it('pone el año del visitante donde está marcado', () => {
    const e = env('<span data-current-year>1999</span>');
    bootDocs(e);
    expect(e.doc.querySelector('[data-current-year]')!.textContent).toBe(
      String(new Date().getFullYear()),
    );
  });

  it('hace ampliables las imágenes del contenido, con los textos de <main>', () => {
    const e = env(content);
    bootDocs(e);
    expect(e.doc.querySelector('button.docs-zoom')!.getAttribute('aria-label')).toBe(
      'Ampliar: Esquema',
    );
    expect(e.doc.querySelector('.docs-zoom-close')!.getAttribute('aria-label')).toBe('Cerrar');
  });

  it('sin los textos del zoom no toca las imágenes', () => {
    const e = env(content.replace(/ data-zoom-label="[^"]*"/, ''));
    bootDocs(e);
    expect(e.doc.querySelector('button.docs-zoom')).toBeNull();
  });

  describe('diagramas de Mermaid', () => {
    const diagram = `<main data-diagram-label="Diagrama" data-copy-label="Copiar" data-copied-label="Copiado" data-copy-failed-label="Error" data-diagram-expand-label="Pantalla completa" data-diagram-zoom-in-label="Acercar" data-diagram-zoom-out-label="Alejar" data-diagram-fit-label="Ajustar" data-zoom-close-label="Cerrar"><div class="docs-mermaid" data-mermaid><pre class="astro-code" data-language="mermaid"><code>A--&gt;B</code></pre></div></main>`;
    const mermaid = () => ({
      importer: vi.fn(async () => ({
        default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg></svg>' })) },
      })),
      readToken: () => '#fff',
    });

    it('los dibuja con la etiqueta de <main>', async () => {
      const m = mermaid();
      const e = env(diagram, { mermaid: m });
      bootDocs(e);
      await vi.waitFor(() =>
        expect(e.doc.querySelector('.docs-mermaid-figure')!.getAttribute('aria-label')).toBe(
          'Diagrama',
        ),
      );
    });

    it('cada diagrama lleva copiar y pantalla completa, con los textos de <main>', async () => {
      const e = env(diagram, { mermaid: mermaid() });
      bootDocs(e);
      await vi.waitFor(() => expect(e.doc.querySelector('.docs-expand')).not.toBeNull());
      const frame = e.doc.querySelector('.docs-mermaid .docs-code')!;
      expect(frame.querySelector('button.docs-copy')!.getAttribute('aria-label')).toBe('Copiar');
      expect(frame.querySelector('button.docs-expand')!.getAttribute('aria-label')).toBe(
        'Pantalla completa',
      );
      const labels = [...e.doc.querySelectorAll('dialog.docs-diagram-dialog button')].map((b) =>
        b.getAttribute('aria-label'),
      );
      expect(labels).toEqual(['Alejar', 'Acercar', 'Ajustar', 'Cerrar']);
    });

    it('sin los textos del visor se dibuja igual pero sin botón de pantalla completa', async () => {
      const e = env(diagram.replace(/ data-diagram-expand-label="[^"]*"/, ''), {
        mermaid: mermaid(),
      });
      bootDocs(e);
      await vi.waitFor(() => expect(e.doc.querySelector('.docs-mermaid-figure')).not.toBeNull());
      expect(e.doc.querySelector('.docs-expand')).toBeNull();
      expect(e.doc.querySelector('dialog')).toBeNull();
    });

    it('en una página sin diagramas no descarga mermaid', () => {
      const m = mermaid();
      bootDocs(env(content, { mermaid: m }));
      expect(m.importer).not.toHaveBeenCalled();
    });
  });

  it('cablea los botones de plegado y de ancho', () => {
    const e = env(
      `<button data-layout-toggle="left" aria-controls="nav" data-collapse-label="Plegar" data-expand-label="Desplegar"></button><div id="nav"></div><button data-layout-width="full"></button>`,
    );
    bootDocs(e);
    (e.doc.querySelector('[data-layout-toggle]') as HTMLElement).click();
    expect(e.doc.documentElement.dataset.left).toBe('collapsed');
    expect(e.doc.getElementById('nav')!.hasAttribute('inert')).toBe(true);
    (e.doc.querySelector('[data-layout-width]') as HTMLElement).click();
    expect(e.doc.documentElement.dataset.width).toBe('full');
  });

  it('sin <main> ni controles no hace nada (ni falla)', () => {
    expect(() => bootDocs(env('<p>x</p>'))).not.toThrow();
  });

  it('muestra los botones de «Copiar para la IA» y de cada prompt (nacen ocultos)', () => {
    const e = env(
      '<button data-report-open="site" hidden>IA</button><button data-copy-prompt="x" hidden>P</button>',
    );
    bootDocs(e);
    expect(e.doc.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(false);
    expect(e.doc.querySelector('[data-copy-prompt]')!.hasAttribute('hidden')).toBe(false);
  });

  it('sin portapapeles dejan de ofrecerse los botones de «Copiar para la IA»', () => {
    const e = env('<button data-report-open="site" hidden>IA</button>', { clipboard: undefined });
    bootDocs(e);
    expect(e.doc.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(true);
  });

  it('sin portapapeles no añade el botón de copiar', () => {
    const e = env(content, { clipboard: undefined });
    bootDocs(e);
    expect(e.doc.querySelector('button.docs-copy')).toBeNull();
  });
});

describe('bootNotFound', () => {
  const page = (pathname: string) =>
    env(
      `<main>EN</main>
       <template data-locale="es" data-title="Perdida"><main>ES</main></template>`,
      { pathname },
    );
  const prepare = (e: BootEnv) => {
    const root = e.doc.documentElement;
    root.setAttribute('data-nf-base', '/repo/');
    root.setAttribute('data-nf-locales', 'en,es');
    root.setAttribute('data-nf-default', 'en');
    root.classList.add('nf-pending');
    return e;
  };

  it('sustituye el cuerpo según la URL pedida (localeFromPath con base)', () => {
    const e = prepare(page('/repo/es/no-existe/'));
    bootNotFound(e);
    expect(e.doc.documentElement.getAttribute('lang')).toBe('es');
    expect(e.doc.body.querySelector('main')!.textContent).toBe('ES');
    expect(e.doc.title).toBe('Perdida');
  });

  it('una ruta del idioma por defecto deja el cuerpo y retira nf-pending', () => {
    const e = prepare(page('/repo/otra/'));
    bootNotFound(e);
    expect(e.doc.documentElement.getAttribute('lang')).toBe('en');
    expect(e.doc.body.querySelector('main')!.textContent).toBe('EN');
    expect(e.doc.documentElement.classList.contains('nf-pending')).toBe(false);
  });

  it('segmento completo: /repo/esx/ no es es', () => {
    const e = prepare(page('/repo/esx/a'));
    bootNotFound(e);
    expect(e.doc.documentElement.getAttribute('lang')).toBe('en');
  });

  it('tras sustituir, los controles del cuerpo nuevo quedan cableados', () => {
    const e = prepare(
      env(
        `<main>EN</main><template data-locale="es" data-title="P"><button data-theme-toggle aria-pressed="x"></button><main>ES</main></template>`,
        { pathname: '/repo/es/x' },
      ),
    );
    bootNotFound(e);
    expect(e.doc.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('bootDocs: desplazamiento de la barra lateral', () => {
  it('guarda la posición de la barra al salir de la página', () => {
    const listeners = new Map<string, () => void>();
    const session = {
      items: new Map<string, string>(),
      getItem(k: string) {
        return this.items.get(k) ?? null;
      },
      setItem(k: string, v: string) {
        this.items.set(k, v);
      },
    };
    const e = env('<aside data-docs-sidebar-scroll></aside>', {
      session: session as unknown as Storage,
      win: {
        addEventListener: (type: string, cb: () => void) => void listeners.set(type, cb),
      } as never,
    });
    (e.doc.querySelector('aside') as HTMLElement).scrollTop = 123;
    bootDocs(e);
    listeners.get('pagehide')!();
    expect(session.items.get('docs:sidebar-scroll')).toBe('123');
  });
});
