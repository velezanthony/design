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
  <main data-copy-label="Copiar" data-copied-label="Copiado" data-copy-failed-label="Error" data-anchor-label="Enlace a {title}">
    <h2 id="a">Uno</h2>
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

  it('sin <main> ni controles no hace nada (ni falla)', () => {
    expect(() => bootDocs(env('<p>x</p>'))).not.toThrow();
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
