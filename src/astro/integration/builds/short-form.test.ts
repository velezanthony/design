import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Sitio monolingüe real (`fixtures/mono`, un solo idioma, `base: '/mono'`): la 404 sigue
   existiendo y no se inyecta ninguna ruta `/<locale>/404`. */

const root = resolve('src/astro/integration/builds/fixtures/mono/site');
let site: BuiltSite;

beforeAll(async () => {
  site = await buildFixture(root);
}, 180_000);

describe('sitio monolingüe', () => {
  it('construye /404.html en el idioma único, sin plantillas ni sustitución', async () => {
    const html = await site.read('404.html');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<meta name="robots" content="noindex"');
    expect(html).not.toContain('<template');
    expect(html).not.toContain('nf-pending');
  });

  it('no se inyecta ninguna ruta /<locale>/404', async () => {
    const entries = await readdir(site.dist, { withFileTypes: true });
    for (const entry of entries.filter((e) => e.isDirectory())) {
      const inner = await readdir(resolve(site.dist, entry.name));
      expect(inner, `dist/${entry.name}/`).not.toContain('404');
    }
    expect(site.output).not.toMatch(/\[locale\]\/404/);
  });

  it('las páginas salen sin prefijo y el sitemap no lleva alternates', async () => {
    expect(await site.read('index.html')).toContain('<main');
    const xml = await site.read('sitemap.xml');
    expect(xml).toContain('<loc>https://example.dev/mono/</loc>');
    expect(xml).not.toContain('xhtml:link');
  });

  it('un sitio que no declara JSON-LD no lleva ninguno: la librería no inyecta nada por defecto', async () => {
    expect(await site.read('index.html')).not.toContain('ld+json');
    expect(await site.read('404.html')).not.toContain('ld+json');
  });
});
