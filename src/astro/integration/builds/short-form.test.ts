import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Sitio monolingüe real (`fixtures/mono`, un solo idioma, `base: '/mono'`). */

const root = resolve('src/astro/integration/builds/fixtures/mono/site');
let site: BuiltSite;

beforeAll(async () => {
  site = await buildFixture(root);
}, 180_000);

describe('sitio monolingüe', () => {
  it('las páginas salen sin prefijo y el sitemap no lleva alternates', async () => {
    expect(await site.read('index.html')).toContain('<main');
    const xml = await site.read('sitemap.xml');
    expect(xml).toContain('<loc>https://example.dev/mono/</loc>');
    expect(xml).not.toContain('xhtml:link');
  });

  it('las páginas propias de src/pages/ entran en el sitemap, salvo las noindex', async () => {
    const xml = await site.read('sitemap.xml');
    expect(xml).toContain('<loc>https://example.dev/mono/about/</loc>');
    expect(xml).not.toContain('hidden');
    expect(site.output).toContain('sitemap: 1 páginas de src/pages/');
  });

  it('un sitio que no declara JSON-LD no lleva ninguno: la librería no inyecta nada por defecto', async () => {
    expect(await site.read('index.html')).not.toContain('ld+json');
  });
});

describe('pie propio (`components.Footer`)', () => {
  it('las páginas de docs llevan el pie del sitio y no el de la librería', async () => {
    const html = await site.read('index.html');
    expect(html.match(/<footer\b/g)).toHaveLength(1);
    expect(html).toContain('data-site-footer');
    expect(html).toContain('Pie de Mono (en)');
    expect(html).not.toContain('data-footer-meta');
  });
});
