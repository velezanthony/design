import { describe, expect, it } from 'vitest';
import { resolveConfig, type ResolvedConfig } from '../config/resolve';
import type { Availability } from '../i18n/availability';
import { buildHead, type HeadConfig, type PageData } from './head';
import { excludeNoindex } from './indexable';
import { resolveMeta, type ResolvedMeta } from './meta';

const site = new URL('https://x.dev');
const url = { base: '/repo' };
const config: ResolvedConfig = resolveConfig({ name: 'Design', locales: ['en', 'es'] });

function meta(extra: Partial<ResolvedMeta> = {}): ResolvedMeta {
  return {
    title: 'Install',
    noindex: false,
    titleSuffix: 'Design',
    schemas: [],
    ...extra,
  };
}
const enPage: PageData = { kind: 'page', slug: 'install', locale: 'en', url: '/repo/install/' };
const esPage: PageData = { kind: 'page', slug: 'install', locale: 'es', url: '/repo/es/install/' };
const pair: Availability = new Map([
  ['install', { en: '/repo/install/', es: '/repo/es/install/' }],
]);
const single: Availability = new Map([['install', { en: '/repo/install/' }]]);

function head(resolvedMeta: ResolvedMeta, page: PageData, availability: Availability) {
  return buildHead(resolvedMeta, page, availability, site, config, url);
}

function metaTag(tags: HeadConfig[], key: 'name' | 'property', value: string) {
  return tags.filter((tag) => tag.tag === 'meta' && tag.attrs[key] === value);
}
function value(tags: HeadConfig[], key: 'name' | 'property', name: string) {
  return metaTag(tags, key, name)[0]?.attrs.content;
}
function links(tags: HeadConfig[], rel: string) {
  return tags.filter((tag) => tag.tag === 'link' && tag.attrs.rel === rel);
}

describe('buildHead: página normal', () => {
  it('<title> con sufijo y og:title / twitter:title sin él', () => {
    const tags = head(meta(), enPage, single);
    expect(tags.find((tag) => tag.tag === 'title')?.content).toBe('Install | Design');
    expect(value(tags, 'property', 'og:title')).toBe('Install');
    expect(value(tags, 'name', 'twitter:title')).toBe('Install');
  });

  it('un único canonical absoluto a su propia URL', () => {
    const canonical = links(head(meta(), esPage, pair), 'canonical');
    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.attrs.href).toBe('https://x.dev/repo/es/install/');
  });

  it('og:* completos', () => {
    const tags = head(meta({ description: 'Desc' }), esPage, pair);
    expect(value(tags, 'property', 'og:description')).toBe('Desc');
    expect(value(tags, 'property', 'og:url')).toBe('https://x.dev/repo/es/install/');
    expect(value(tags, 'property', 'og:type')).toBe('article');
    expect(value(tags, 'property', 'og:site_name')).toBe('Design');
    expect(value(tags, 'property', 'og:locale')).toBe('es');
    expect(tags.find((tag) => tag.attrs.name === 'description')?.attrs.content).toBe('Desc');
    expect(value(tags, 'name', 'twitter:description')).toBe('Desc');
  });

  it('sin descripción no hay ninguna etiqueta de descripción', () => {
    const tags = head(meta(), enPage, single);
    expect(metaTag(tags, 'name', 'description')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:description')).toEqual([]);
    expect(metaTag(tags, 'name', 'twitter:description')).toEqual([]);
  });

  it('og:locale usa guion bajo para regiones', () => {
    const tags = head(meta(), { ...enPage, locale: 'pt-BR' }, single);
    expect(value(tags, 'property', 'og:locale')).toBe('pt_BR');
  });
});

describe('buildHead: sin sufijo', () => {
  it('<title> es solo el título si no hay sufijo', () => {
    const tags = head(meta({ titleSuffix: undefined }), enPage, single);
    expect(tags.find((tag) => tag.tag === 'title')?.content).toBe('Install');
  });
});

describe('buildHead: traducciones', () => {
  it('hreflang de cada idioma real (incluida ella misma) más x-default', () => {
    const alternates = links(head(meta(), esPage, pair), 'alternate');
    expect(alternates.map((alternate) => [alternate.attrs.hreflang, alternate.attrs.href])).toEqual(
      [
        ['en', 'https://x.dev/repo/install/'],
        ['es', 'https://x.dev/repo/es/install/'],
        ['x-default', 'https://x.dev/repo/install/'],
      ],
    );
  });

  it('og:locale:alternate solo de las traducciones reales', () => {
    const tags = head(meta(), enPage, pair);
    expect(
      metaTag(tags, 'property', 'og:locale:alternate').map((tag) => tag.attrs.content),
    ).toEqual(['es']);
  });

  it('una sola página: sin hreflang ni og:locale:alternate', () => {
    const tags = head(meta(), enPage, single);
    expect(links(tags, 'alternate')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:locale:alternate')).toEqual([]);
  });

  it('una gemela noindex no se lista (con la disponibilidad filtrada)', () => {
    const tags = head(meta(), enPage, excludeNoindex(pair, new Set(['/repo/es/install/'])));
    expect(links(tags, 'alternate')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:locale:alternate')).toEqual([]);
  });

  it('la ruta de reserva de otro idioma nunca aparece como gemela real', () => {
    // La disponibilidad solo trae páginas reales: la reserva `/es/changelog/` no está.
    const tags = head(meta(), enPage, new Map([['changelog', { en: '/repo/changelog/' }]]));
    expect(links(tags, 'alternate')).toEqual([]);
  });
});

describe('buildHead: imagen', () => {
  const image = { src: '/og.png', alt: 'Logo', width: 1200, height: 630 };

  it('og:image ABSOLUTA con site + base + src, con medidas y alt', () => {
    const tags = head(meta({ image }), enPage, single);
    expect(value(tags, 'property', 'og:image')).toBe('https://x.dev/repo/og.png');
    expect(value(tags, 'property', 'og:image:width')).toBe('1200');
    expect(value(tags, 'property', 'og:image:height')).toBe('630');
    expect(value(tags, 'property', 'og:image:alt')).toBe('Logo');
    expect(value(tags, 'name', 'twitter:image')).toBe('https://x.dev/repo/og.png');
    expect(value(tags, 'name', 'twitter:image:alt')).toBe('Logo');
    expect(value(tags, 'name', 'twitter:card')).toBe('summary_large_image');
  });

  it('una URL https se respeta tal cual y sin medidas no se emiten', () => {
    const tags = head(meta({ image: { src: 'https://cdn.x/og.png', alt: 'A' } }), enPage, single);
    expect(value(tags, 'property', 'og:image')).toBe('https://cdn.x/og.png');
    expect(metaTag(tags, 'property', 'og:image:width')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:image:height')).toEqual([]);
  });

  it('con base terminada en barra no duplica la barra', () => {
    const tags = buildHead(meta({ image }), enPage, single, site, config, { base: '/repo/' });
    expect(value(tags, 'property', 'og:image')).toBe('https://x.dev/repo/og.png');
  });

  it('sin imagen no hay og:image* ni twitter:image* y la tarjeta es summary', () => {
    const tags = head(meta(), enPage, single);
    expect(
      tags.some((tag) => /og:image|twitter:image/.test(tag.attrs.property ?? tag.attrs.name ?? '')),
    ).toBe(false);
    expect(value(tags, 'name', 'twitter:card')).toBe('summary');
  });
});

describe('buildHead: noindex, reserva y 404', () => {
  it('seo.noindex: robots noindex y sin alternates propios', () => {
    const tags = head(meta({ noindex: true }), esPage, pair);
    expect(value(tags, 'name', 'robots')).toBe('noindex');
    expect(links(tags, 'alternate')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:locale:alternate')).toEqual([]);
  });

  it('una página normal indexable no emite robots', () => {
    expect(metaTag(head(meta(), enPage, single), 'name', 'robots')).toEqual([]);
  });

  it('fallback: noindex, canonical ABSOLUTO al original, sin hreflang ni og:locale:alternate', () => {
    const fallback: PageData = {
      kind: 'fallback',
      slug: 'changelog',
      locale: 'es',
      url: '/repo/es/changelog/',
      canonical: '/repo/changelog/',
    };
    const tags = head(meta(), fallback, new Map([['changelog', { en: '/repo/changelog/' }]]));
    expect(value(tags, 'name', 'robots')).toBe('noindex');
    expect(links(tags, 'canonical').map((link) => link.attrs.href)).toEqual([
      'https://x.dev/repo/changelog/',
    ]);
    expect(links(tags, 'alternate')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:locale:alternate')).toEqual([]);
    expect(value(tags, 'property', 'og:locale')).toBe('es');
  });

  it('notFound: noindex, sin canonical ni alternates', () => {
    const notFound: PageData = {
      kind: 'notFound',
      slug: '404',
      locale: 'en',
      url: '/repo/404.html',
    };
    const tags = head(meta(), notFound, pair);
    expect(value(tags, 'name', 'robots')).toBe('noindex');
    expect(links(tags, 'canonical')).toEqual([]);
    expect(links(tags, 'alternate')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:locale:alternate')).toEqual([]);
    expect(metaTag(tags, 'property', 'og:url')).toEqual([]);
  });
});

describe('buildHead + resolveMeta', () => {
  it('encadena la cascada con la salida del head', () => {
    const resolved = resolveMeta(
      { titleSuffix: 'Design', description: { en: 'Docs', es: 'Documentación' } },
      { title: 'Instalar Design' },
      { title: 'Instalar' },
      'es',
    );
    const tags = head(resolved, esPage, pair);
    expect(tags.find((tag) => tag.tag === 'title')?.content).toBe('Instalar Design | Design');
    expect(value(tags, 'property', 'og:description')).toBe('Documentación');
  });
});

describe('buildHead: favicon', () => {
  function icons(tags: HeadConfig[]) {
    return links(tags, 'icon');
  }

  it('por defecto emite el favicon del paquete, con base, en toda página', () => {
    const page = icons(head(meta(), enPage, single));
    expect(page).toHaveLength(1);
    expect(page[0]?.attrs).toEqual({
      rel: 'icon',
      href: '/repo/_design/favicon.png',
      type: 'image/png',
    });
  });

  it('también en rutas de reserva y 404', () => {
    const fallback: PageData = { ...enPage, kind: 'fallback', canonical: '/repo/install/' };
    const notFound: PageData = { ...enPage, kind: 'notFound', slug: '' };
    expect(icons(head(meta(), fallback, single))).toHaveLength(1);
    expect(icons(head(meta(), notFound, new Map()))).toHaveLength(1);
  });

  it('el favicon de la config manda: ruta con base o https tal cual', () => {
    const local = { ...config, favicon: 'favicon.svg' };
    const tags = buildHead(meta(), enPage, single, site, local, url);
    expect(icons(tags)[0]?.attrs).toEqual({
      rel: 'icon',
      href: '/repo/favicon.svg',
      type: 'image/svg+xml',
    });
    const remote = { ...config, favicon: 'https://cdn.dev/i.ico' };
    expect(icons(buildHead(meta(), enPage, single, site, remote, url))[0]?.attrs.href).toBe(
      'https://cdn.dev/i.ico',
    );
  });

  it('extensión desconocida: sin atributo type', () => {
    const odd = { ...config, favicon: '/i.webp' };
    expect(icons(buildHead(meta(), enPage, single, site, odd, url))[0]?.attrs).toEqual({
      rel: 'icon',
      href: '/repo/i.webp',
    });
  });
});

describe('buildHead: JSON-LD', () => {
  function scripts(tags: HeadConfig[]) {
    return tags.filter((tag) => tag.tag === 'script');
  }

  it('sin schemas no hay ningún <script>: la librería no inyecta nada por defecto', () => {
    expect(scripts(head(meta(), enPage, single))).toEqual([]);
  });

  it('un <script type="application/ld+json"> por schema, con JSON válido', () => {
    const schemas = [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme' },
      { '@context': 'https://schema.org', '@type': 'Person', name: 'Ada' },
    ];
    const found = scripts(head(meta({ schemas }), enPage, single));
    expect(found).toHaveLength(2);
    expect(found.every((tag) => tag.attrs.type === 'application/ld+json')).toBe(true);
    expect(found.map((tag) => JSON.parse(tag.content ?? ''))).toEqual(schemas);
  });

  it('un valor hostil no puede cerrar el <script>', () => {
    const schemas = [{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }];
    const [tag] = scripts(head(meta({ schemas }), enPage, single));
    expect(tag?.content).not.toContain('<');
  });

  it('también salen en las páginas de reserva y en la 404', () => {
    const schemas = [{ '@type': 'Thing' }];
    const fallback: PageData = { ...esPage, kind: 'fallback', canonical: '/repo/install/' };
    const notFound: PageData = { ...esPage, kind: 'notFound' };
    expect(scripts(head(meta({ schemas }), fallback, pair))).toHaveLength(1);
    expect(scripts(head(meta({ schemas }), notFound, pair))).toHaveLength(1);
  });
});
