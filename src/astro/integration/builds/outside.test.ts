import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Contenido fuera del proyecto de Astro: `fixtures/outside/site` (el proyecto) con las páginas en
   su hermana `fixtures/outside/docs` (`content: '../docs'`) y el CHANGELOG en la raíz del repo. Se
   construye UNA vez; cada test comprueba un caso de la opción. */

const root = resolve('src/astro/integration/builds/fixtures/outside/site');
let site: BuiltSite;

beforeAll(async () => {
  site = await buildFixture(root);
}, 180_000);

function hrefs(html: string) {
  return [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
}

describe('páginas de ../docs', () => {
  it('se publican, con sub-carpetas y sufijos de idioma; los que no son .md no son páginas', async () => {
    for (const file of [
      'index.html',
      'es/index.html',
      'users/guia/index.html',
      'es/users/guia/index.html',
      'users/otra/index.html',
    ]) {
      expect(await site.read(file)).toContain('<main');
    }
    await expect(site.read('requirements/index.html')).rejects.toThrow();
    await expect(site.read('requirements.txt/index.html')).rejects.toThrow();
  });

  it('`nav[].dir` es relativo a la carpeta de contenido', async () => {
    expect(hrefs(await site.read('index.html'))).toContain('/repo/users/guia/');
  });
});

describe('enlaces y anclas', () => {
  it('relativos entre páginas, en el idioma de la página que enlaza', async () => {
    const en = hrefs(await site.read('users/guia/index.html'));
    expect(en).toContain('/repo/');
    expect(en).toContain('/repo/users/otra/#paso');
    const es = hrefs(await site.read('es/users/guia/index.html'));
    expect(es).toContain('/repo/es/');
    expect(es).toContain('/repo/es/users/otra/#paso');
    expect(hrefs(await site.read('es/index.html'))).toContain('/repo/es/users/guia/#uso');
  });

  it('de una página a un external de la raíz del repo y de vuelta', async () => {
    expect(hrefs(await site.read('users/guia/index.html'))).toContain('/repo/changelog/#v1');
    expect(hrefs(await site.read('changelog/index.html'))).toContain('/repo/users/guia/#uso');
    expect(hrefs(await site.read('es/changelog/index.html'))).toContain('/repo/es/users/guia/#uso');
  });
});

describe('imágenes', () => {
  it('relativas (`img/x.png` y `../assets/x.png`) se emiten con tamaño y alt, listas para el zoom', async () => {
    const html = await site.read('users/guia/index.html');
    const images = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    const sources = images.map((img) => /src="([^"]+)"/.exec(img)?.[1]);
    expect(sources).toHaveLength(2);
    for (const src of sources) expect(src).toMatch(/^\/repo\/_astro\/.+\.(png|webp)$/);
    for (const img of images) {
      expect(img).toMatch(/width="128"/);
      expect(img).toMatch(/height="128"/);
      expect(img).toMatch(/alt="[^"]+"/);
    }
    const emitted = await readdir(resolve(site.dist, '_astro'));
    expect(emitted.filter((file) => /^(captura|x)\./.test(file))).toHaveLength(2);
  });
});

describe('«Editar esta página»', () => {
  it('apunta al archivo real del repo, no a la ruta de la carpeta de Astro', async () => {
    const html = await site.read('es/users/guia/index.html');
    expect(html).toContain('https://github.com/o/r/edit/main/docs/users/guia.es.md');
    expect(await site.read('users/guia/index.html')).toContain(
      'https://github.com/o/r/edit/main/docs/users/guia.md',
    );
  });
});

describe('plugins de Markdown de la librería', () => {
  it('admonición, Mermaid y pestañas se aplican a los archivos de ../docs', async () => {
    expect(await site.read('index.html')).toContain('data-kind="tip"');
    const guide = await site.read('users/guia/index.html');
    expect(guide).toContain('class="docs-mermaid"');
    expect(guide.match(/class="docs-tab-panel"/g)).toHaveLength(2);
  });
});
