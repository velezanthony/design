import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../testing/build';

/* Tests de riesgo del diseño que solo existen en una build real. Se construye UNA vez el proyecto
   de `fixtures/basic` (`base: '/repo'`) y cada test lee su parte. Lento a propósito. */

const root = resolve('src/astro/integration/fixtures/basic/site');
let site: BuiltSite;

beforeAll(async () => {
  site = await buildFixture(root);
}, 180_000);

const probe = async () => JSON.parse(await readFile(resolve(root, 'probe.json'), 'utf8'));

describe('#1 el loader lee la config de ctx.config.integrations (plan A) o de docs.config.mjs (plan B)', () => {
  it('plan A inviable: Astro descarta la config adjunta a la integración', async () => {
    expect((await probe()).ownKeys).not.toContain('resolvedConfig');
  });

  it('genera páginas para los nativos y para el external declarado en docs.config.mjs (plan B)', async () => {
    expect(await site.read('en/guide/index.html')).toContain('Guide');
    expect(await site.read('es/guide/index.html')).toContain('Guía');
    expect(await site.read('en/changelog/index.html')).toContain('Changelog');
    expect(await site.read('es/changelog/index.html')).toContain('Registro de cambios');
  });
});

describe('#2 processor extendido en sitio', () => {
  it('Astro ve las directivas activas y restoreDirectives el último, junto al plugin del consumidor', async () => {
    const seen = await probe();
    expect(seen.directive).toBe(true);
    expect(seen.plugins[0]).toBe('probeLocale');
    expect(seen.plugins.at(-1)).toBe('restore-directives');
  });

  it.each(['en/guide', 'es/guide', 'en/changelog', 'es/changelog'])(
    'en %s (nativo o external) x:y, 12:30, http://a.b y :emoji: salen como texto',
    async (page) => {
      const html = await site.read(`${page}/index.html`);
      if (page.endsWith('guide')) {
        expect(html).toContain('12:30');
        expect(html).toContain('x:y');
        expect(html).toContain(':emoji:');
      } else {
        expect(html).toContain('12:30');
        expect(html).toContain('x:y');
      }
      expect(html).toContain('http://a.b');
    },
  );
});

describe('#3 el plugin recibe fileURL también en los external', () => {
  it('la factoría titula en el idioma del archivo (nativo y external)', async () => {
    expect(await site.read('en/index/index.html')).toContain(
      'data-probe-locale="en" data-probe-file="index.md"',
    );
    expect(await site.read('es/index/index.html')).toContain(
      'data-probe-locale="es" data-probe-file="index.es.md"',
    );
    expect(await site.read('en/changelog/index.html')).toContain(
      'data-probe-locale="en" data-probe-file="CHANGELOG.md"',
    );
    expect(await site.read('es/changelog/index.html')).toContain(
      'data-probe-locale="es" data-probe-file="CHANGELOG.es.md"',
    );
  });
});

describe('#4 Pagefind por la API de Node con base', () => {
  const realFetch = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  /** Busca como lo haría el navegador: `fetch` de `http://x/repo/**` leído de `dist/`. */
  async function search(lang: string, term: string): Promise<string[]> {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input), 'http://x/repo/');
      try {
        return new Response(
          await readFile(resolve(site.dist, url.pathname.replace(/^\/repo\//, ''))),
        );
      } catch {
        return new Response('no encontrado', { status: 404 });
      }
    };
    Object.assign(globalThis, {
      location: { origin: 'http://x', href: 'http://x/repo/' },
      window: globalThis,
      document: { querySelector: () => ({ getAttribute: () => lang }), documentElement: { lang } },
    });
    const pagefind = await import(
      /* @vite-ignore */ `${pathToFileURL(resolve(site.dist, 'pagefind/pagefind.js')).href}?${lang}`
    );
    await pagefind.options({ basePath: 'http://x/repo/pagefind/' });
    await pagefind.init();
    const { results } = await pagefind.search(term);
    return (
      await Promise.all(results.map((r: { data(): Promise<{ url: string }> }) => r.data()))
    ).map((d) => d.url);
  }

  it('escribe el índice en dist/pagefind/', async () => {
    expect(await site.read('pagefind/pagefind-entry.json')).toContain('languages');
  });

  it('indexa por idioma y las URLs de los resultados llevan la base', async () => {
    expect(await search('es', 'buscable-es')).toEqual(['/repo/es/guide/']);
    expect(await search('en', 'buscable-en')).toEqual(['/repo/en/guide/']);
  });
});

describe('#5 imágenes relativas de un external bajo base', () => {
  it('la URL emitida empieza por /repo/', async () => {
    const html = await site.read('en/changelog/index.html');
    const src = /<img[^>]*src="([^"]+)"/.exec(html)?.[1];
    expect(src).toMatch(/^\/repo\//);
  });
});

describe('#6 fuentes por updateConfig', () => {
  it('se fusionan con las del consumidor', async () => {
    const seen = await probe();
    expect(seen.fonts).toEqual(
      expect.arrayContaining(['Consumer Font', 'IBM Plex Sans', 'IBM Plex Mono']),
    );
  });
});

describe('#7 ids de encabezado github-slugger', () => {
  it('dedupe con -n y acentos conservados', async () => {
    const html = await site.read('en/guide/index.html');
    expect(html).toContain('id="usage"');
    expect(html).toContain('id="usage-1"');
    expect(html).toContain('id="instalación"');
  });
});

describe('#8 plugins de Markdown en una build real', () => {
  it('directiva con título por defecto localizado por fileURL, en nativo', async () => {
    const html = await site.read('es/guide/index.html');
    expect(html).toContain('data-kind="note"');
    expect(html).toContain('<p class="admonition-title">Nota</p>');
  });

  it('alerta de GitHub en un external (es) con el título localizado', async () => {
    const html = await site.read('es/changelog/index.html');
    expect(html).toContain('data-kind="warning"');
    expect(html).toContain('>Advertencia<');
  });

  it('desplegable, alerta IMPORTANT, pestañas y tabla desplazable', async () => {
    const html = await site.read('en/guide/index.html');
    expect(html).toContain('<details class="admonition" data-kind="tip">');
    expect(html).toContain('data-kind="info"');
    expect(html).toContain('>Important<');
    expect(html.match(/class="docs-tab-panel"/g)).toHaveLength(2);
    expect(html).toContain('table-scroll');
  });

  it('django y pycon se resaltan por su alias sin romper la build', async () => {
    const html = await site.read('en/guide/index.html');
    expect(html.match(/class="astro-code[^"]*"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('--shiki-dark');
  });
});
