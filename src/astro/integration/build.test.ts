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
    expect(await site.read('guide/index.html')).toContain('Guide');
    expect(await site.read('es/guide/index.html')).toContain('Guía');
    expect(await site.read('changelog/index.html')).toContain('Changelog');
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

  it.each(['guide', 'es/guide', 'changelog', 'es/changelog'])(
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
    expect(await site.read('index.html')).toContain(
      'data-probe-locale="en" data-probe-file="index.md"',
    );
    expect(await site.read('es/index.html')).toContain(
      'data-probe-locale="es" data-probe-file="index.es.md"',
    );
    expect(await site.read('changelog/index.html')).toContain(
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
    expect(await search('en', 'buscable-en')).toEqual(['/repo/guide/']);
  });
});

describe('#5 imágenes relativas de un external bajo base', () => {
  it('la URL emitida empieza por /repo/', async () => {
    const html = await site.read('changelog/index.html');
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
    const html = await site.read('guide/index.html');
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
    const html = await site.read('guide/index.html');
    expect(html).toContain('<details class="admonition" data-kind="tip">');
    expect(html).toContain('data-kind="info"');
    expect(html).toContain('>Important<');
    expect(html.match(/class="docs-tab-panel"/g)).toHaveLength(2);
    expect(html).toContain('table-scroll');
  });

  it('django y pycon se resaltan por su alias sin romper la build', async () => {
    const html = await site.read('guide/index.html');
    expect(html.match(/class="astro-code[^"]*"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('--shiki-dark');
  });
});

describe('#9 rutas inyectadas bajo base', () => {
  it('la página de docs existe en /repo/<slug>/ (idioma por defecto sin prefijo) y en /repo/es/<slug>/', async () => {
    for (const file of ['index.html', 'guide/index.html', 'es/index.html', 'es/guide/index.html']) {
      expect(await site.read(file)).toContain('<main');
    }
  });

  it('sitemap.xml: único, con la base, los alternates por idioma y sin 404', async () => {
    const xml = await site.read('sitemap.xml');
    expect(xml).toContain('<loc>https://example.dev/repo/guide/</loc>');
    expect(xml).toContain('<loc>https://example.dev/repo/es/guide/</loc>');
    expect(xml).toContain('hreflang="es" href="https://example.dev/repo/es/guide/"');
    expect(xml).not.toContain('404');
  });

  it('404.html en la raíz de base y /<locale>/404/ por idioma no por defecto', async () => {
    expect(await site.read('404.html')).toContain('<main');
    expect(await site.read('es/404/index.html')).toContain('lang="es"');
    expect(await site.read('es/404/index.html')).toContain('Página no encontrada');
    await expect(site.read('en/404/index.html')).rejects.toThrow();
  });
});

describe('#10 fusión: el plugin de Vite del consumidor se conserva', () => {
  it('sigue entre los plugins junto al del módulo virtual', async () => {
    const seen = await probe();
    expect(seen.vitePlugins).toEqual(
      expect.arrayContaining(['consumer-vite-plugin', 'velezanthony-design-virtual-config']),
    );
  });
});

describe('#11 layouts y rutas de la Fase 12', () => {
  const count = (html: string, needle: string) => html.split(needle).length - 1;

  it('página real: lang, head con canonical y hreflang, salto, <main> indexable y barra lateral', async () => {
    const html = await site.read('es/guide/index.html');
    expect(html).toContain('<html lang="es"');
    expect(html).toContain('<link rel="canonical" href="https://example.dev/repo/es/guide/"');
    expect(html).toContain('hreflang="en" href="https://example.dev/repo/guide/"');
    expect(html).toContain('href="#main-content"');
    expect(html).toMatch(/<main[^>]*id="main-content"[^>]*data-pagefind-body/);
    expect(count(html, 'data-pagefind-body')).toBe(1);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('name="theme-color"');
  });

  it('edición apunta al archivo del idioma y el banner de consentimiento lleva el contenedor', async () => {
    const html = await site.read('es/guide/index.html');
    expect(html).toContain('https://github.com/o/r/edit/main/');
    expect(html).toContain('guide.es.md');
    expect(html).toContain('data-gtm-id="GTM-TEST"');
    expect(html).not.toContain('googletagmanager.com');
  });

  it('noindex: robots, <main> con data-pagefind-ignore, fuera del sitemap', async () => {
    const html = await site.read('hidden/index.html');
    expect(html).toContain('<meta name="robots" content="noindex"');
    expect(html).not.toContain('data-pagefind-body');
    expect(html).toMatch(/<main[^>]*data-pagefind-ignore/);
    expect(await site.read('sitemap.xml')).not.toContain('/repo/hidden/');
  });

  it('ruta de reserva: contenido original en <div lang>, aviso, noindex y canonical al original', async () => {
    const html = await site.read('es/fallback-demo/index.html');
    expect(html).toContain('<html lang="es"');
    expect(html).toContain('<div lang="en"');
    expect(html).toContain('role="note"');
    expect(html).toContain('<meta name="robots" content="noindex"');
    expect(html).toContain('<link rel="canonical" href="https://example.dev/repo/fallback-demo/"');
    expect(html).not.toContain('rel="alternate"');
    expect(html).not.toContain('data-pagefind-body');
    const xml = await site.read('sitemap.xml');
    expect(xml).toContain('/repo/fallback-demo/');
    expect(xml).not.toContain('/repo/es/fallback-demo/');
    expect(await site.read('fallback-demo/index.html')).toContain('data-pagefind-body');
  });

  it('404.html: idioma por defecto, plantilla del resto, noindex sin canonical, fuera del índice', async () => {
    const html = await site.read('404.html');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<template data-locale="es"');
    expect(html).toContain('Página no encontrada');
    expect(html).toContain('nf-pending');
    expect(html).toContain('<meta name="robots" content="noindex"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('data-pagefind-body');
    expect(html).toMatch(/<main[^>]*data-pagefind-ignore/);
    expect(html).toContain('data-nf-base="/repo/"');
  });

  it('404.html: un único script de módulo, que sustituye ANTES de cablear el cliente', async () => {
    const html = await site.read('404.html');
    const scripts = [...html.matchAll(/<script type="module"([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const [, attrs, inline] = scripts[0]!;
    const src = /src="([^"]+)"/.exec(attrs!)?.[1];
    let code = src ? await site.read(src.replace(/^\/repo\//, '')) : inline!;
    const chunk = /from"\.\/([^"]+)"/.exec(code)?.[1];
    if (chunk) code += await site.read(`_astro/${chunk}`);
    expect(code).toContain('nf-pending');
    expect(html.indexOf('<script type="module"')).toBeLessThan(html.indexOf('</body>'));
  });

  it('/es/404/: su idioma directamente, sin plantillas, noindex', async () => {
    const html = await site.read('es/404/index.html');
    expect(html).toContain('<html lang="es"');
    expect(html).not.toContain('<template');
    expect(html).toContain('<meta name="robots" content="noindex"');
    expect(html).toMatch(/<main[^>]*data-pagefind-ignore/);
  });
});
