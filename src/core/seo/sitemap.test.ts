import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import { buildAvailability, type Availability, type UrlPolicy } from '../i18n/availability';
import { DocsError } from '../errors';
import { fallbackRoutes } from '../i18n/translation-policy';
import type { ClientPage } from './client-pages';
import type { HeadFacts } from './html-head';
import {
  appendToSitemap,
  buildSitemap,
  clientSitemapEntries,
  buildSitemapIndex,
  SITEMAP_PAGES,
  SITEMAP_STYLESHEET_PATH,
  sitemapFiles,
  sitemapIncludes,
} from './sitemap';

const site = new URL('https://x.dev');
const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };
function locs(xml: string) {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
}

describe('buildSitemap', () => {
  const availability: Availability = new Map([
    ['install', { en: '/repo/install/', es: '/repo/es/install/' }],
    ['changelog', { en: '/repo/changelog/' }],
  ]);

  it('es un único urlset con URLs absolutas', () => {
    const xml = buildSitemap(availability, site);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(locs(xml)).toEqual([
      'https://x.dev/repo/install/',
      'https://x.dev/repo/es/install/',
      'https://x.dev/repo/changelog/',
    ]);
  });

  it('enlaza su hoja de estilo con una ruta relativa, para que funcione bajo cualquier base', () => {
    const [, stylesheet] = buildSitemap(availability, site).split('\n');
    expect(stylesheet).toBe('<?xml-stylesheet type="text/css" href="_design/sitemap.css"?>');
    expect(SITEMAP_STYLESHEET_PATH).toBe('/_design/sitemap.css');
  });

  it('una pareja lista ambos alternates en cada URL', () => {
    const xml = buildSitemap(availability, site);
    const block = xml.split('<url>')[1];
    expect(block).toContain('rel="alternate" hreflang="en" href="https://x.dev/repo/install/"');
    expect(block).toContain('rel="alternate" hreflang="es" href="https://x.dev/repo/es/install/"');
  });

  it('una página de un solo idioma no lleva alternates', () => {
    const xml = buildSitemap(new Map([['changelog', { en: '/repo/changelog/' }]]), site);
    expect(xml).not.toContain('xhtml:link');
  });

  it('exactamente 50 000 URLs pasan y 50 001 lanzan con el número y el límite', () => {
    function many(count: number): Availability {
      return new Map(
        Array.from({ length: count }, (_item, index) => [`p${index}`, { en: `/repo/p${index}/` }]),
      );
    }
    expect(locs(buildSitemap(many(50_000), site))).toHaveLength(50_000);
    function attempt() {
      return buildSitemap(many(50_001), site);
    }
    expect(attempt).toThrow(DocsError);
    expect(attempt).toThrow(/50001.*50000|50 001.*50 000/);
  });

  it('las páginas noindex salen y desaparecen de los alternates de sus gemelas', () => {
    const xml = buildSitemap(availability, site, new Set(['/repo/es/install/']));
    expect(locs(xml)).toEqual(['https://x.dev/repo/install/', 'https://x.dev/repo/changelog/']);
    expect(xml).not.toContain('hreflang="es"');
    expect(xml).not.toContain('xhtml:link');
  });

  it('escapa los caracteres especiales de XML', () => {
    const xml = buildSitemap(new Map([['a&b', { en: '/repo/a&b/' }]]), site);
    expect(locs(xml)).toEqual(['https://x.dev/repo/a&amp;b/']);
  });

  it('las rutas de reserva y la 404 presentes en el build no aparecen', () => {
    const pages: Page[] = [
      { slug: 'changelog', locale: 'en', title: 'c', kind: 'native', body: '', sourcePath: 'c.md' },
    ];
    const real = buildAvailability(pages, url);
    const routes = fallbackRoutes({
      availability: real,
      policies: new Map([['changelog', 'fallback']]),
      config: { locales: ['en', 'es'], defaultLocale: 'en' },
      url,
      pages,
    });
    expect(routes).toHaveLength(1);
    const xml = buildSitemap(real, site);
    expect(xml).not.toContain('/repo/es/changelog/');
    expect(xml).not.toContain('404');
    expect(xml).not.toContain('xhtml:link');
  });
});

describe('buildSitemapIndex', () => {
  const index = buildSitemapIndex([
    'https://x.dev/sitemap-pages.xml',
    'https://x.dev/lib/sitemap.xml',
  ]);

  it('es un sitemapindex con un <sitemap> por URL, en orden', () => {
    expect(index.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(index).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(locs(index)).toEqual([
      'https://x.dev/sitemap-pages.xml',
      'https://x.dev/lib/sitemap.xml',
    ]);
  });

  it('enlaza la misma hoja de estilo que el sitemap de páginas', () => {
    expect(index.split('\n')[1]).toBe(
      '<?xml-stylesheet type="text/css" href="_design/sitemap.css"?>',
    );
  });

  it('escapa los caracteres especiales de XML', () => {
    expect(buildSitemapIndex(['https://x.dev/a.xml?x=1&y=2'])).toContain('a.xml?x=1&amp;y=2');
  });
});

function thrown(run: () => unknown): DocsError {
  try {
    run();
  } catch (error) {
    if (error instanceof DocsError) return error;
    throw error;
  }
  throw new Error('no ha fallado');
}

describe('sitemapIncludes', () => {
  const rootSite = new URL('https://x.dev');

  it('las rutas se resuelven contra el origen del sitio, no contra su base', () => {
    expect(sitemapIncludes(['/lib/sitemap.xml'], new URL('https://x.dev/repo/'))).toEqual([
      'https://x.dev/lib/sitemap.xml',
    ]);
  });

  it('una ruta sin barra inicial también cuelga del dominio, no de la carpeta del sitio', () => {
    expect(sitemapIncludes(['lib/sitemap.xml'], new URL('https://x.dev/repo/'))).toEqual([
      'https://x.dev/lib/sitemap.xml',
    ]);
  });

  it('una URL completa del mismo dominio se acepta tal cual', () => {
    expect(sitemapIncludes(['https://x.dev/lib/sitemap.xml'], rootSite)).toEqual([
      'https://x.dev/lib/sitemap.xml',
    ]);
  });

  it('una URL de otro dominio falla nombrando `sitemap.include[i]`', () => {
    function run() {
      return sitemapIncludes(['/a.xml', 'https://otro.dev/sitemap.xml'], rootSite);
    }
    expect(run).toThrow(DocsError);
    expect(thrown(run).hint).toBeTruthy();
    expect(run).toThrow(/sitemap\.include\[1\].*otro\.dev/);
  });

  it('el propio índice o el de páginas no se pueden incluir: se apuntarían a sí mismos', () => {
    expect(thrown(() => sitemapIncludes(['/sitemap.xml'], rootSite)).hint).toBeTruthy();
    expect(() => sitemapIncludes(['/sitemap.xml'], rootSite)).toThrow(/sitemap\.include\[0\]/);
    expect(() => sitemapIncludes([`/${SITEMAP_PAGES}`], rootSite)).toThrow(DocsError);
  });
});

describe('clientSitemapEntries', () => {
  const rootSite = new URL('https://x.dev');
  function client(path: string, head: Partial<HeadFacts> = {}): ClientPage {
    return {
      path,
      pattern: path,
      entrypoint: 'src/pages/x.astro',
      head: { noindex: false, alternates: [], headings: [], og: {}, jsonLd: [], ...head },
    };
  }

  it('cada página indexable con su URL publicada y sus idiomas tal como los declara', () => {
    const alternates = [
      { hreflang: 'es', href: 'https://x.dev/cv/' },
      { hreflang: 'en', href: 'https://x.dev/en/resume/' },
    ];
    expect(clientSitemapEntries([client('/cv/', { alternates })], rootSite)).toEqual([
      { loc: 'https://x.dev/cv/', alternates },
    ]);
  });

  it('las noindex se quedan fuera', () => {
    expect(clientSitemapEntries([client('/privacy/', { noindex: true })], rootSite)).toEqual([]);
  });

  it('las que declaran como canónica otra URL también: el sitemap solo lleva canónicas', () => {
    const copies = [
      client('/a/', { canonical: 'https://x.dev/a/' }),
      client('/b/', { canonical: 'https://x.dev/a/' }),
    ];
    expect(clientSitemapEntries(copies, rootSite).map(({ loc }) => loc)).toEqual([
      'https://x.dev/a/',
    ]);
  });
});

describe('buildSitemap con páginas del cliente', () => {
  const availability: Availability = new Map([['install', { en: '/repo/install/' }]]);
  const cv = {
    loc: 'https://x.dev/repo/cv/',
    alternates: [
      { hreflang: 'es', href: 'https://x.dev/repo/cv/' },
      { hreflang: 'en', href: 'https://x.dev/repo/en/cv/' },
    ],
  };

  it('van después de las de la documentación, con sus alternates', () => {
    const xml = buildSitemap(availability, site, new Set(), [cv]);
    expect(locs(xml)).toEqual(['https://x.dev/repo/install/', 'https://x.dev/repo/cv/']);
    expect(xml).toContain(
      '<url><loc>https://x.dev/repo/cv/</loc><xhtml:link rel="alternate" hreflang="es" href="https://x.dev/repo/cv/"/><xhtml:link rel="alternate" hreflang="en" href="https://x.dev/repo/en/cv/"/></url>',
    );
  });

  it('una del cliente con la URL de una de la documentación la sustituye: no sale dos veces', () => {
    const own = { loc: 'https://x.dev/repo/install/', alternates: [] };
    const xml = buildSitemap(availability, site, new Set(), [own]);
    expect(locs(xml)).toEqual(['https://x.dev/repo/install/']);
    expect(xml).toContain('<url><loc>https://x.dev/repo/install/</loc></url>');
  });

  it('cuentan para el límite de URLs', () => {
    const many: Availability = new Map(
      Array.from({ length: 50_000 }, (_item, index) => [`p${index}`, { en: `/repo/p${index}/` }]),
    );
    expect(() => buildSitemap(many, site, new Set(), [cv])).toThrow(/50001/);
  });
});

describe('appendToSitemap', () => {
  const entry = { loc: 'https://x.dev/cv/', alternates: [] };

  it('añade las entradas al final de un sitemap ya escrito', () => {
    const xml = buildSitemap(new Map([['a', { en: '/a/' }]]), site);
    const merged = appendToSitemap(xml, [entry]);
    expect(locs(merged)).toEqual(['https://x.dev/a/', 'https://x.dev/cv/']);
    expect(merged.endsWith('</urlset>\n')).toBe(true);
  });

  it('una entrada con la URL de otra ya escrita la sustituye', () => {
    const xml = buildSitemap(new Map([['a', { en: '/a/', es: '/es/a/' }]]), site);
    const merged = appendToSitemap(xml, [{ loc: 'https://x.dev/a/', alternates: [] }]);
    expect(locs(merged)).toEqual(['https://x.dev/es/a/', 'https://x.dev/a/']);
    expect(merged).toContain('<url><loc>https://x.dev/a/</loc></url>');
  });

  it('sustituye varias entradas a la vez y deja un único cierre', () => {
    const xml = buildSitemap(
      new Map([
        ['a', { en: '/a/' }],
        ['b', { en: '/b/' }],
        ['c', { en: '/c/' }],
      ]),
      site,
    );
    const merged = appendToSitemap(xml, [
      { loc: 'https://x.dev/a/', alternates: [] },
      { loc: 'https://x.dev/b/', alternates: [] },
    ]);
    expect(locs(merged)).toEqual(['https://x.dev/c/', 'https://x.dev/a/', 'https://x.dev/b/']);
    expect(merged.split('</urlset>')).toHaveLength(2);
  });

  it('sin entradas lo deja tal cual', () => {
    const xml = buildSitemap(new Map([['a', { en: '/a/' }]]), site);
    expect(appendToSitemap(xml, [])).toBe(xml);
  });

  it('escapa los caracteres especiales de XML', () => {
    const xml = buildSitemap(new Map(), site);
    expect(appendToSitemap(xml, [{ loc: 'https://x.dev/?a=1&b=2', alternates: [] }])).toContain(
      '?a=1&amp;b=2',
    );
  });
});

describe('sitemapFiles', () => {
  it('sin otros sitemaps, las páginas van en sitemap.xml y no hay índice', () => {
    expect(sitemapFiles([])).toEqual({ index: false, pages: 'sitemap.xml' });
  });

  it('con otros sitemaps, sitemap.xml es el índice y las páginas van aparte', () => {
    expect(sitemapFiles(['/lib/sitemap.xml'])).toEqual({ index: true, pages: SITEMAP_PAGES });
  });
});

describe('lastmod', () => {
  const availability: Availability = new Map([
    ['install', { en: '/repo/install/', es: '/repo/es/install/' }],
  ]);

  it('cada URL con fecha lleva su lastmod antes de los alternates; la que no la tiene, ninguno', () => {
    const lastmods = new Map([['/repo/install/', '2026-09-07T00:06:43+02:00']]);
    const xml = buildSitemap(availability, site, new Set(), [], lastmods);
    expect(xml).toContain(
      '<url><loc>https://x.dev/repo/install/</loc><lastmod>2026-09-07T00:06:43+02:00</lastmod><xhtml:link',
    );
    expect(xml).toContain('<url><loc>https://x.dev/repo/es/install/</loc><xhtml:link');
  });

  it('una página del cliente con fecha la lleva, también al añadirla a un sitemap escrito', () => {
    const entry = {
      loc: 'https://x.dev/cv/',
      alternates: [],
      lastmod: '2026-09-07T00:06:43+02:00',
    };
    expect(buildSitemap(new Map(), site, new Set(), [entry])).toContain(
      '<url><loc>https://x.dev/cv/</loc><lastmod>2026-09-07T00:06:43+02:00</lastmod></url>',
    );
    expect(appendToSitemap(buildSitemap(new Map(), site), [entry])).toContain(
      '<lastmod>2026-09-07T00:06:43+02:00</lastmod>',
    );
  });

  it('clientSitemapEntries toma la fecha del archivo de cada página', () => {
    const page: ClientPage = {
      path: '/cv/',
      pattern: '/cv',
      entrypoint: 'src/pages/cv.astro',
      head: { noindex: false, alternates: [], headings: [], og: {}, jsonLd: [] },
    };
    const dates = new Map([['src/pages/cv.astro', '2026-09-07T00:06:43+02:00']]);
    expect(clientSitemapEntries([page], site, dates)[0]?.lastmod).toBe('2026-09-07T00:06:43+02:00');
    expect(clientSitemapEntries([page], site)[0]).not.toHaveProperty('lastmod');
  });
});
