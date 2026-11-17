import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import { seoPage } from '../../../testing/seo-page';
import Inspector from './Inspector.astro';

const props = (extra: Record<string, unknown> = {}) => {
  const page = (extra['page'] as ReturnType<typeof seoPage>) ?? seoPage();
  return {
    page,
    group: [page],
    inspectorHrefs: { en: '/i/?locale=en', es: '/i/?locale=es' },
    inspectorHref: (target: { slug: string; locale: string }) =>
      `/i/?slug=${target.slug}&locale=${target.locale}`,
    liveHref: '/repo/guide/',
    displayUrl: 'https://x.dev/repo/guide/',
    ogImageSrc: '/repo/og.png',
    pagesHref: '/p/',
    ...extra,
  };
};

describe('Inspector', () => {
  it('un duplicado enlaza al inspector de la página con la que choca', async () => {
    const page = seoPage({
      issues: [
        {
          kind: 'duplicate-title',
          severity: 'warning',
          slug: 'guide',
          locale: 'en',
          message: 'Otra página del mismo idioma tiene el mismo título.',
          value: 2,
          related: [{ slug: 'reference/guide', locale: 'en' }],
        },
      ],
    });
    const doc = await render(Inspector, props({ page }));
    const link = doc.querySelector<HTMLAnchorElement>('[data-issues] a[data-related]');
    expect(link?.getAttribute('href')).toBe('/i/?slug=reference/guide&locale=en');
    expect(text(link)).toContain('reference/guide');
  });

  it('enseña el <title> publicado y de dónde sale la descripción', async () => {
    const doc = await render(Inspector, props());
    const content = text(doc);
    expect(content).toContain('Guide | Site');
    expect(content).toContain('A description of the guide.');
    expect(content).toContain('De la página');
  });

  it('lleva la vista previa del buscador y la tarjeta Open Graph', async () => {
    const doc = await render(Inspector, props());
    expect(doc.querySelector('[data-serp="title"]')).not.toBeNull();
    expect(doc.querySelector('[data-og-card]')).not.toBeNull();
  });

  it('enseña el canonical y si la página es noindex', async () => {
    const page = seoPage();
    page.meta.noindex = true;
    const doc = await render(Inspector, props({ page }));
    expect(text(doc.querySelector('[data-field="canonical"]'))).toContain('/repo/guide/');
    expect(text(doc.querySelector('[data-field="noindex"]'))).toContain('Sí');
  });

  it('el esquema de encabezados marca el salto de nivel', async () => {
    const page = seoPage({
      headings: [
        { depth: 1, slug: 'a', text: 'Uno' },
        { depth: 2, slug: 'b', text: 'Dos' },
        { depth: 4, slug: 'c', text: 'Cuatro' },
      ],
    });
    const doc = await render(Inspector, props({ page }));
    const items = [...doc.querySelectorAll('[data-outline] li')];
    expect(items).toHaveLength(3);
    expect(items[2]!.hasAttribute('data-skip')).toBe(true);
    expect(text(items[2])).toContain('H2 → H4');
    expect(items[1]!.hasAttribute('data-skip')).toBe(false);
  });

  it('sin encabezados lo dice', async () => {
    const doc = await render(Inspector, props({ page: seoPage({ headings: [] }) }));
    expect(text(doc.querySelector('[data-outline-empty]'))).toContain('Sin encabezados');
  });

  it('lista los problemas de la página', async () => {
    const page = seoPage({
      issues: [
        {
          kind: 'no-h1',
          severity: 'error',
          slug: 'guide',
          locale: 'en',
          message: 'La página no tiene ningún H1.',
        },
      ],
    });
    const doc = await render(Inspector, props({ page }));
    expect(text(doc.querySelector('[data-issues]'))).toContain('La página no tiene ningún H1.');
  });

  it('cada problema enseña cómo arreglarlo bajo su mensaje', async () => {
    const page = seoPage({
      issues: [
        {
          kind: 'title-too-long',
          severity: 'warning',
          slug: 'guide',
          locale: 'en',
          message: 'El título se recorta en los resultados.',
          fix: 'Acorta el título: `seo.title` en el frontmatter de `guide.md`.',
        },
      ],
    });
    const doc = await render(Inspector, props({ page }));
    const fix = doc.querySelector('[data-issues] [data-fix]');
    expect(text(fix)).toContain('seo.title');
    expect(text(fix)).toContain('guide.md');
  });

  it('sin problemas lo dice', async () => {
    const doc = await render(Inspector, props());
    expect(text(doc.querySelector('[data-issues]'))).toContain('Sin problemas');
  });

  it('las traducciones van lado a lado, con enlace al inspector de cada idioma y marcando la ausente', async () => {
    const en = seoPage({
      locale: 'en',
      locales: [
        { locale: 'en', status: 'present', url: '/repo/guide/' },
        { locale: 'es', status: 'missing', policy: 'link', declared: false },
      ],
    });
    const doc = await render(Inspector, props({ page: en, group: [en] }));
    const columns = [...doc.querySelectorAll('[data-translation]')];
    expect(columns.map((c) => c.getAttribute('data-translation'))).toEqual(['en', 'es']);
    expect(text(columns[1])).toContain('Falta');
    expect(text(columns[1])).toContain('link');
  });

  it('una traducción presente enlaza a su inspector', async () => {
    const en = seoPage({ locale: 'en' });
    const es = seoPage({ locale: 'es', meta: { ...seoPage().meta, title: 'Guía | Site' } });
    en.locales = [
      { locale: 'en', status: 'present', url: '/repo/guide/' },
      { locale: 'es', status: 'present', url: '/repo/es/guide/' },
    ];
    const doc = await render(Inspector, props({ page: en, group: [en, es] }));
    const link = doc.querySelector('[data-translation="es"] a[href="/i/?locale=es"]');
    expect(link).not.toBeNull();
    expect(text(doc.querySelector('[data-translation="es"]'))).toContain('Guía | Site');
  });

  it('enlaza a la página real y a la tabla', async () => {
    const doc = await render(Inspector, props());
    expect(doc.querySelector('a[href="/repo/guide/"]')).not.toBeNull();
    expect(doc.querySelector('a[href="/p/"]')).not.toBeNull();
  });

  describe('Schemas (JSON-LD)', () => {
    const schemas = [
      {
        schema: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme' },
        source: 'site' as const,
      },
      {
        schema: {
          '@context': 'https://schema.org',
          '@type': ['Person', 'Thing'],
          name: '</script><b>Ada</b> & co',
        },
        source: 'page' as const,
      },
    ];

    it('lista cada schema con su @type, su origen y el JSON formateado', async () => {
      const doc = await render(Inspector, props({ page: seoPage({ schemas }) }));
      const items = [...doc.querySelectorAll('[data-schemas] [data-schema]')];
      expect(items).toHaveLength(2);
      expect(text(items[0])).toContain('Organization');
      expect(text(items[0])).toContain('sitio');
      expect(text(items[1])).toContain('Person, Thing');
      expect(text(items[1])).toContain('página');
      expect(items[0].querySelector('pre')!.textContent).toBe(
        JSON.stringify(schemas[0].schema, null, 2),
      );
    });

    it('el JSON va escapado para HTML: no se cuela etiqueta alguna', async () => {
      const doc = await render(Inspector, props({ page: seoPage({ schemas }) }));
      const pre = doc.querySelectorAll('[data-schemas] pre')[1];
      expect(pre.querySelector('b')).toBeNull();
      expect(pre.textContent).toContain('</script><b>Ada</b> & co');
    });

    it('sin schemas, el estado vacío', async () => {
      const doc = await render(Inspector, props());
      expect(text(doc.querySelector('[data-schemas]'))).toContain(
        'Esta página no declara ningún schema.',
      );
    });
  });
});
