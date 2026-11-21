import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { splitNavTrees } from '../../core/navigation/nav-tree';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { createMarkdownEnv } from './env';
import { navTree } from './nav-tree';
import { restoreDirectives } from './restore-directives';

const nav: DocsUserConfig['nav'] = [
  { label: { es: 'Desarrollo', en: 'Development' }, sidebar: ['git'] },
  { label: 'GitHub', href: 'https://github.com/x/y' },
  { label: { es: 'Sistemas', en: 'Systems' }, sidebar: ['aws'] },
];

function envWith(user: Partial<DocsUserConfig> = {}) {
  return createMarkdownEnv(
    resolveConfig({ name: 'x', locales: ['es', 'en'], nav, ...user }),
    project,
  );
}

function render(source: string, fileURL = docFileURL('articulos.md'), env = envWith()) {
  return renderMarkdown(source, {
    fileURL,
    features: { directive: true },
    plugins: [navTree(env), restoreDirectives],
  });
}

async function failure(source: string, env = envWith()) {
  const error = await render(source, docFileURL('articulos.md'), env).catch(
    (caught: unknown) => caught as Error,
  );
  expect(error).toBeInstanceOf(AstroError);
  return error as AstroError;
}

describe('navTree (`::nav-tree`)', () => {
  it('pone un h2 con la etiqueta de cada sección y, debajo, el hueco de su árbol', async () => {
    const html = await render('# Artículos\n\n::nav-tree');
    expect(splitNavTrees(html)).toEqual([
      { kind: 'html', html: '<h1>Artículos</h1>\n<h2>Desarrollo</h2>\n' },
      { kind: 'tree', section: 0, descriptions: true },
      { kind: 'html', html: '\n<h2>Sistemas</h2>\n' },
      { kind: 'tree', section: 2, descriptions: true },
      { kind: 'html', html: '\n' },
    ]);
  });

  it('las etiquetas van en el idioma del archivo', async () => {
    const html = await render('::nav-tree', docFileURL('articulos.en.md'));
    expect(html).toContain('<h2>Development</h2>');
    expect(html).toContain('<h2>Systems</h2>');
  });

  it('`section` deja solo una sección, nombrada por su etiqueta en cualquier idioma', async () => {
    for (const name of ['Sistemas', 'Systems']) {
      const html = await render(`::nav-tree{section="${name}"}`);
      expect(html).not.toContain('Desarrollo');
      expect(splitNavTrees(html)).toContainEqual({ kind: 'tree', section: 2, descriptions: true });
    }
  });

  it('`descriptions="false"` pinta el árbol sin las descripciones', async () => {
    const html = await render('::nav-tree{descriptions="false"}');
    expect(splitNavTrees(html)).toContainEqual({ kind: 'tree', section: 0, descriptions: false });
  });

  it('una sección que no existe rompe el build con el archivo, la línea y las que hay', async () => {
    const error = await failure('# A\n\n::nav-tree{section="Blog"}');
    expect(error.message).toContain('«Blog»');
    expect(error.message).toContain('src/content/docs/articulos.md:3');
    expect(error.hint).toContain('Desarrollo');
    expect(error.hint).toContain('Sistemas');
  });

  it('un atributo desconocido o un valor de `descriptions` que no es true/false rompen el build', async () => {
    expect((await failure('::nav-tree{depth="2"}')).message).toContain('depth');
    expect((await failure('::nav-tree{descriptions="no"}')).message).toContain('descriptions');
  });

  it('sin secciones en `nav` rompe el build: no hay árbol que pintar', async () => {
    const error = await failure('::nav-tree', envWith({ nav: undefined }));
    expect(error.message).toContain('nav');
  });

  it('con texto (`::nav-tree[…]`) o como contenedor rompe el build', async () => {
    await failure('::nav-tree[Índice]');
    await failure(':::nav-tree\nx\n:::');
  });

  it('fuera de la documentación no se toca', async () => {
    const html = await render('::nav-tree', nonDocFileURL('a.md'));
    expect(html).not.toContain('data-docs-nav-tree');
    expect(html).toContain('::nav-tree');
  });
});
