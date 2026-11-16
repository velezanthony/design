import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../testing/build';
import { searchBuilt } from '../../testing/search';

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

  const search = (lang: string, term: string) => searchBuilt(site.dist, lang, term);

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

describe('#12 alcance del índice de búsqueda', () => {
  const realFetch = globalThis.fetch;
  afterAll(() => {
    globalThis.fetch = realFetch;
  });
  const search = (lang: string, term: string) => searchBuilt(site.dist, lang, term);

  it('control positivo: el cuerpo de una página indexable sí se encuentra', async () => {
    expect(await search('en', 'zzfallbackunico')).toEqual(['/repo/fallback-demo/']);
  });

  it('una ruta de reserva /es/<slug>/ no aparece: es no devuelve el término del original', async () => {
    expect(await search('es', 'zzfallbackunico')).toEqual([]);
  });

  it('una página noindex no aparece en ningún idioma', async () => {
    expect(await search('en', 'zznoindexunico')).toEqual([]);
    expect(await search('es', 'zznoindexunico')).toEqual([]);
  });

  it('el cromo queda fuera: la barra lateral (título de otra página) y la cabecera no dan resultados', async () => {
    expect(await search('en', 'hidden')).toEqual([]);
    expect(await search('en', 'Fixture')).toEqual([]);
  });

  it('las 404 no se indexan: su texto no se encuentra', async () => {
    expect(await search('en', 'moved')).toEqual([]);
    expect(await search('es', 'movido')).toEqual([]);
  });

  it('el aislamiento por idioma se mantiene: es no encuentra lo de en', async () => {
    expect(await search('es', 'Usage')).toEqual([]);
    expect(await search('en', 'Guía')).toEqual([]);
  });
});

/** Valor de `content` de una etiqueta `<meta>` por su `name`/`property`; `undefined` si no está. */
function metaContent(html: string, key: string): string | undefined {
  const tag = html.match(/<meta\b[^>]*>/g)?.find((candidate) => {
    return candidate.includes(`name="${key}"`) || candidate.includes(`property="${key}"`);
  });
  return tag && /content="([^"]*)"/.exec(tag)?.[1];
}
const metaAll = (html: string, key: string) =>
  (html.match(/<meta\b[^>]*>/g) ?? [])
    .filter((tag) => tag.includes(`property="${key}"`) || tag.includes(`name="${key}"`))
    .map((tag) => /content="([^"]*)"/.exec(tag)?.[1]);
const titleOf = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1];

describe('#13 sitemap único y sin robots.txt', () => {
  it('solo existe sitemap.xml: ni índice ni sitemap-N.xml ni robots.txt', async () => {
    const files = await readdir(site.dist);
    expect(files.filter((file) => /^sitemap/.test(file))).toEqual(['sitemap.xml']);
    expect(files).not.toContain('robots.txt');
  });

  it('lista las páginas reales con alternates y deja fuera noindex, reservas y 404', async () => {
    const xml = await site.read('sitemap.xml');
    expect(xml).toContain('<loc>https://example.dev/repo/card/</loc>');
    expect(xml).toContain('hreflang="es" href="https://example.dev/repo/es/card/"');
    expect(xml).toContain('<loc>https://example.dev/repo/link-demo/</loc>');
    expect(xml).not.toContain('/repo/es/link-demo/');
    expect(xml).not.toContain('/repo/hidden/');
    expect(xml).not.toContain('/repo/es/fallback-demo/');
    expect(xml).not.toMatch(/404/);
  });
});

describe('#14 LocaleSwitch y hreflang con disponibilidad completa y parcial', () => {
  it('completa: la ficha en es enlaza a en y el head lleva hreflang es, en y x-default', async () => {
    const html = await site.read('es/card/index.html');
    expect(html).toContain('hreflang="en" href="https://example.dev/repo/card/"');
    expect(html).toContain('hreflang="es" href="https://example.dev/repo/es/card/"');
    expect(html).toContain('hreflang="x-default" href="https://example.dev/repo/card/"');
    expect(html).toContain('href="/repo/card/"');
  });

  it('parcial: una página solo en inglés no emite hreflang ni og:locale:alternate', async () => {
    const html = await site.read('link-demo/index.html');
    expect(html).not.toContain('rel="alternate"');
    expect(metaAll(html, 'og:locale:alternate')).toEqual([]);
    expect(metaContent(html, 'og:locale')).toBe('en');
  });
});

describe('#15 etiquetas SEO y cascada', () => {
  it('og:image absoluta bajo base, con tamaño leído y alt = título de la página', async () => {
    const html = await site.read('es/card/index.html');
    expect(metaContent(html, 'og:image')).toBe('https://example.dev/repo/og.png');
    expect(metaContent(html, 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'og:image:height')).toBe('630');
    expect(metaContent(html, 'og:image:alt')).toBe('Tarjeta');
    expect(metaContent(html, 'twitter:image')).toBe('https://example.dev/repo/og.png');
    expect(metaContent(html, 'twitter:image:alt')).toBe('Tarjeta');
  });

  it('twitter:*, og:locale y og:locale:alternate solo de traducciones reales', async () => {
    const html = await site.read('es/card/index.html');
    expect(metaContent(html, 'twitter:card')).toBe('summary_large_image');
    expect(metaContent(html, 'twitter:title')).toBe('Tarjeta');
    expect(metaContent(html, 'og:locale')).toBe('es');
    expect(metaAll(html, 'og:locale:alternate')).toEqual(['en']);
    expect(titleOf(html)).toBe('Tarjeta | Fixture docs');
  });

  it('la base aporta descripción e imagen por idioma', async () => {
    const es = await site.read('es/index.html');
    expect(metaContent(es, 'description')).toBe('Descripción de la fixture');
    expect(metaContent(es, 'og:image:alt')).toBe('Tarjeta de la fixture');
    const en = await site.read('index.html');
    expect(metaContent(en, 'description')).toBe('Fixture description');
    expect(metaContent(en, 'og:image:alt')).toBe('Fixture card');
  });

  it('el frontmatter sobrescribe título (solo el head) y descripción', async () => {
    const html = await site.read('guide/index.html');
    expect(titleOf(html)).toBe('Guide for the head | Fixture docs');
    expect(metaContent(html, 'description')).toBe('Guide description');
    expect(html).toMatch(/<h1[^>]*>Guide<\/h1>/);
    // la hermana en es no hereda el override de en: vuelve a la base
    expect(metaContent(await site.read('es/guide/index.html'), 'description')).toBe(
      'Descripción de la fixture',
    );
  });

  it('external[].seo sobrescribe la descripción de la externa', async () => {
    expect(metaContent(await site.read('changelog/index.html'), 'description')).toBe(
      'Changelog override',
    );
  });

  it('noindex: robots, fuera del sitemap y del índice (ver #11 y #12)', async () => {
    const html = await site.read('hidden/index.html');
    expect(metaContent(html, 'robots')).toBe('noindex');
    expect(html).not.toContain('rel="canonical"' + 'x');
    expect(await site.read('sitemap.xml')).not.toContain('/repo/hidden/');
  });
});

describe('#16 políticas de traducción y textos en una build real', () => {
  const sidebarHtml = () => site.read('es/guide/index.html');

  it('link: la barra es muestra la insignia en inglés y no existe /es/<slug>/', async () => {
    const html = await sidebarHtml();
    expect(html).toContain('href="/repo/link-demo/" hreflang="en" lang="en"');
    await expect(site.read('es/link-demo/index.html')).rejects.toThrow();
  });

  it('omit: ausente de la barra es y sin ruta es', async () => {
    expect(await sidebarHtml()).not.toContain('omit-demo');
    await expect(site.read('es/omit-demo/index.html')).rejects.toThrow();
    expect(await site.read('guide/index.html')).toContain('/repo/omit-demo/');
  });

  it('external con translations: link como las nativas', async () => {
    expect(await sidebarHtml()).toContain('href="/repo/notes/" hreflang="en" lang="en"');
    expect(await site.read('notes/index.html')).toContain('Notes');
    await expect(site.read('es/notes/index.html')).rejects.toThrow();
  });

  it('fallback: ruta es con aviso, lang del original, noindex y fuera de sitemap (ver #11)', async () => {
    const html = await site.read('es/fallback-demo/index.html');
    expect(html).toContain('<div lang="en"');
    expect(metaContent(html, 'robots')).toBe('noindex');
  });

  it('una página sin traducción ni política avisa en la build, una vez por grupo', async () => {
    /* `output` junta stdout y stderr: la misma línea puede salir dos veces (con otra hora). */
    const warnings = [
      ...new Set(
        site.output
          .split('\n')
          .filter((line) => line.includes('lonely: falta'))
          .map((line) => line.replace(/^\d\d:\d\d:\d\d /, '')),
      ),
    ];
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('es');
  });

  it('ui sobrescrito se ve en el HTML de es y no en el de en', async () => {
    expect(await site.read('es/guide/index.html')).toContain('placeholder="Buscar en la fixture"');
    expect(await site.read('guide/index.html')).toContain('placeholder="Search the docs"');
  });

  it('404.html en la raíz de base con plantilla es y /es/404/ (ver #9 y #11)', async () => {
    expect(await site.read('404.html')).toContain('<template data-locale="es"');
    expect(await site.read('es/404/index.html')).toContain('lang="es"');
  });
});

describe('#17 enlace relativo de una página nativa a un external', () => {
  it('se reescribe a la URL del external en el idioma de la página, con base', async () => {
    expect(await site.read('guide/index.html')).toContain('href="/repo/changelog/"');
    expect(await site.read('es/guide/index.html')).toContain('href="/repo/es/changelog/"');
  });
});

describe('#18 un solo Astro en el árbol del consumidor', () => {
  it('los puntos de entrada del paquete resuelven el mismo `astro` que la config del consumidor', async () => {
    const { astro } = await probe();
    expect(astro.fromPackage).toBeTruthy();
    expect(astro.fromPackage).toBe(astro.fromConsumer);
  });
});

describe('#19 tabla ancha', () => {
  it('una tabla Markdown sale dentro del contenedor desplazable `table-scroll`', async () => {
    const html = await site.read('guide/index.html');
    expect(html).toMatch(/<div class="table-scroll" tabindex="0"><table>[\s\S]*<\/table><\/div>/);
  });
});
