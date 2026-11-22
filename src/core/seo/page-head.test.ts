import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../config/resolve';
import type { HeadConfig } from './head';
import { buildPageHead, type PageHeadInput } from './page-head';

const site = new URL('https://x.dev');
const config = {
  ...resolveConfig({
    site: {
      name: 'Anthony',
      favicon: '/favicon-32.png',
      seo: {
        ogLocales: { es: 'es_ES', en: 'en_GB' },
        titleSuffix: 'Anthony',
        image: { src: '/og.png', alt: 'Anthony' },
        schema: [{ '@type': 'WebSite', name: 'Anthony' }],
      },
    },
    i18n: { locales: ['es', 'en'], defaultLocale: 'es' },
  }),
  base: '/',
};
const sizes = new Map([['/og.png', { width: 1200, height: 630 }]]);
const alternates = { es: '/proyectos/', en: '/en/projects/' };

function head(input: Partial<PageHeadInput> = {}, withSizes = sizes) {
  return buildPageHead(
    { title: 'Proyectos', locale: 'es', url: '/proyectos/', alternates, ...input },
    config,
    site,
    withSizes,
  );
}
function meta(tags: HeadConfig[], key: 'name' | 'property', name: string) {
  return tags.find((tag) => tag.tag === 'meta' && tag.attrs[key] === name)?.attrs.content;
}
function links(tags: HeadConfig[], rel: string) {
  return tags.filter((tag) => tag.tag === 'link' && tag.attrs.rel === rel);
}
function jsonLd(tags: HeadConfig[]) {
  return tags
    .filter((tag) => tag.tag === 'script')
    .map((tag) => JSON.parse(tag.content ?? '{}') as Record<string, unknown>);
}

describe('buildPageHead: valores del sitio', () => {
  it('el título y og:title llevan el sufijo del sitio', () => {
    const tags = head();
    expect(tags.find((tag) => tag.tag === 'title')?.content).toBe('Proyectos | Anthony');
    expect(meta(tags, 'property', 'og:title')).toBe('Proyectos | Anthony');
  });

  it('un título igual al sufijo no se repite', () => {
    expect(head({ title: 'Anthony' }).find((tag) => tag.tag === 'title')?.content).toBe('Anthony');
  });

  it('la imagen por defecto sale absoluta, con su tamaño y su alt', () => {
    const tags = head();
    expect(meta(tags, 'property', 'og:image')).toBe('https://x.dev/og.png');
    expect(meta(tags, 'property', 'og:image:width')).toBe('1200');
    expect(meta(tags, 'property', 'og:image:height')).toBe('630');
    expect(meta(tags, 'property', 'og:image:alt')).toBe('Anthony');
  });

  it('el favicon y el og:locale vienen de la config', () => {
    const tags = head();
    expect(links(tags, 'icon')[0]?.attrs).toMatchObject({
      href: '/favicon-32.png',
      type: 'image/png',
    });
    expect(meta(tags, 'property', 'og:locale')).toBe('es_ES');
    expect(meta(tags, 'property', 'og:locale:alternate')).toBe('en_GB');
  });

  it('el JSON-LD del sitio va en cada página', () => {
    expect(jsonLd(head())).toEqual([
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Anthony' },
    ]);
  });
});

describe('buildPageHead: el bloque seo', () => {
  it('el bloque manda sobre el sitio: título, sufijo, descripción e imagen', () => {
    const tags = head({
      seo: {
        title: 'Otro título',
        titleSuffix: false,
        description: 'Una descripción',
        image: { src: '/otra.png', alt: 'Otra' },
      },
    });
    expect(tags.find((tag) => tag.tag === 'title')?.content).toBe('Otro título');
    expect(meta(tags, 'name', 'description')).toBe('Una descripción');
    expect(meta(tags, 'property', 'og:image')).toBe('https://x.dev/otra.png');
    expect(meta(tags, 'property', 'og:image:alt')).toBe('Otra');
  });

  it('valores sueltos sin Markdown: solo `description` ya basta', () => {
    expect(meta(head({ seo: { description: 'Hola' } }), 'name', 'description')).toBe('Hola');
  });

  it('seo.schema se suma al del sitio y `false` lo quita todo', () => {
    expect(jsonLd(head({ seo: { schema: [{ '@type': 'Thing' }] } }))).toHaveLength(2);
    expect(jsonLd(head({ seo: { schema: false } }))).toEqual([]);
  });
});

describe('buildPageHead: URL, idiomas y og:type', () => {
  it('canonical y og:url absolutos, hreflang de cada idioma y x-default del idioma por defecto', () => {
    const tags = head({ locale: 'en', url: '/en/projects/' });
    expect(links(tags, 'canonical')[0]?.attrs.href).toBe('https://x.dev/en/projects/');
    expect(meta(tags, 'property', 'og:url')).toBe('https://x.dev/en/projects/');
    expect(links(tags, 'alternate').map((tag) => [tag.attrs.hreflang, tag.attrs.href])).toEqual([
      ['es', 'https://x.dev/proyectos/'],
      ['en', 'https://x.dev/en/projects/'],
      ['x-default', 'https://x.dev/proyectos/'],
    ]);
  });

  it('sin alternates no hay hreflang', () => {
    expect(links(head({ alternates: undefined }), 'alternate')).toEqual([]);
  });

  it('og:type por defecto article y `website` cuando se pide', () => {
    expect(meta(head(), 'property', 'og:type')).toBe('article');
    expect(meta(head({ ogType: 'website' }), 'property', 'og:type')).toBe('website');
  });
});

describe('buildPageHead: noindex', () => {
  it('robots noindex y sin canonical ni hreflang', () => {
    const tags = head({ seo: { noindex: true } });
    expect(meta(tags, 'name', 'robots')).toBe('noindex');
    expect(links(tags, 'canonical')).toEqual([]);
    expect(links(tags, 'alternate')).toEqual([]);
  });
});

describe('buildPageHead: JSON-LD de la página', () => {
  it('el extra va después del del sitio, con @context si le falta y sin romper </script>', () => {
    const tags = head({ schema: [{ '@type': 'Person', name: '</script>' }] });
    expect(jsonLd(tags).map((schema) => schema['@type'])).toEqual(['WebSite', 'Person']);
    expect(jsonLd(tags)[1]?.['@context']).toBe('https://schema.org');
    expect(tags.at(-1)?.content).not.toContain('</script>');
  });

  it('el extra sobrevive a `seo.schema: false`: lo pone el código, no el frontmatter', () => {
    expect(
      jsonLd(head({ seo: { schema: false }, schema: [{ '@type': 'Person' }] })).map(
        (schema) => schema['@type'],
      ),
    ).toEqual(['Person']);
  });
});
