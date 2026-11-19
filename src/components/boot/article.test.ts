import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { bootArticle } from './article';
import { content, env } from './fixtures/env';

describe('bootArticle', () => {
  it('cablea pestañas, botón de copiar y anclas de encabezado', () => {
    const bootEnv = env(content);
    bootArticle(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('.docs-tabs[data-enhanced]')).not.toBeNull();
    expect(bootEnv.htmlDocument.querySelector('button.docs-copy')!.textContent).toBe('Copiar');
    expect(bootEnv.htmlDocument.querySelector('a.heading-anchor')!.getAttribute('aria-label')).toBe(
      'Enlace a Uno',
    );
  });

  it('hace ampliables las imágenes del contenido, con los textos de <main>', () => {
    const bootEnv = env(content);
    bootArticle(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('button.docs-zoom')!.getAttribute('aria-label')).toBe(
      'Ampliar: Esquema',
    );
    expect(bootEnv.htmlDocument.querySelector('.docs-zoom-close')!.getAttribute('aria-label')).toBe(
      'Cerrar',
    );
  });

  it('sin los textos del zoom no toca las imágenes', () => {
    const bootEnv = env(content.replace(/ data-zoom-label="[^"]*"/, ''));
    bootArticle(bootEnv);
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
      bootArticle(bootEnv);
      await vi.waitFor(() =>
        expect(
          bootEnv.htmlDocument.querySelector('.docs-mermaid-figure')!.getAttribute('aria-label'),
        ).toBe('Diagrama'),
      );
    });

    it('cada diagrama lleva copiar y pantalla completa, con los textos de <main>', async () => {
      const bootEnv = env(diagram, { mermaid: mermaid() });
      bootArticle(bootEnv);
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
      bootArticle(bootEnv);
      await vi.waitFor(() =>
        expect(bootEnv.htmlDocument.querySelector('.docs-mermaid-figure')).not.toBeNull(),
      );
      expect(bootEnv.htmlDocument.querySelector('.docs-expand')).toBeNull();
      expect(bootEnv.htmlDocument.querySelector('dialog')).toBeNull();
    });

    it('el código de diagramas no va en el script de todas las páginas: se carga solo si hay uno', () => {
      const source = readFileSync(new URL('./article.ts', import.meta.url), 'utf8');
      expect(source).not.toMatch(/^import \{[^}]*\} from '[^']*client\/diagrams\/mermaid';$/m);
      expect(source).toContain("import('../../client/diagrams/mermaid')");
    });

    it('en una página sin diagramas no descarga mermaid', () => {
      const fakeMermaid = mermaid();
      bootArticle(env(content, { mermaid: fakeMermaid }));
      expect(fakeMermaid.importer).not.toHaveBeenCalled();
    });
  });

  it('sin <main> no hace nada (ni falla)', () => {
    expect(() => bootArticle(env('<p>x</p>'))).not.toThrow();
  });

  it('no cablea lo propio de docs: ni el año ni los plegables', () => {
    const bootEnv = env(
      `<span data-current-year>1999</span><button data-layout-toggle="left" aria-controls="nav" data-collapse-label="P" data-expand-label="D"></button><div id="nav"></div>`,
    );
    bootArticle(bootEnv);
    (bootEnv.htmlDocument.querySelector('[data-layout-toggle]') as HTMLElement).click();
    expect(bootEnv.htmlDocument.querySelector('[data-current-year]')!.textContent).toBe('1999');
    expect(bootEnv.htmlDocument.documentElement.dataset.left).toBeUndefined();
  });

  it('sin portapapeles no añade el botón de copiar', () => {
    const bootEnv = env(content, { clipboard: undefined });
    bootArticle(bootEnv);
    expect(bootEnv.htmlDocument.querySelector('button.docs-copy')).toBeNull();
  });
});
