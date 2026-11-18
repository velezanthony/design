import { describe, expect, it } from 'vitest';
import type { ResolvedSchema } from '../../../seo/json-ld';
import { seoPage } from '../../../../testing/seo-page';
import { EMPTY_FILTERS, serializeFilters } from '../../queries/url-filters';
import { estimateWidth } from '../../pixels';
import { THRESHOLDS } from '../../thresholds';
import type { SeoPage, SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';
import { inspectorModel } from './model';

const links: PanelLinks = {
  pages: (filters = EMPTY_FILTERS) => `/p/${serializeFilters(filters).toString()}`,
  inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  overview: () => '/o/',
};

function run(pages: SeoPage[], slug = 'guide', locale = 'en') {
  const tree: SeoTree = { pages };
  return inspectorModel({
    tree,
    slug,
    locale,
    links,
    site: 'https://x.dev',
    asset: (src) => `/repo${src}`,
  });
}

describe('inspectorModel', () => {
  it('sin página con ese slug e idioma no hay modelo', () => {
    expect(run([seoPage()], 'otra')).toBeUndefined();
    expect(run([seoPage()], 'guide', 'es')).toBeUndefined();
  });

  it('lleva el slug y el idioma de la página inspeccionada', () => {
    expect(run([seoPage({ slug: '' })], '')).toMatchObject({ slug: '', locale: 'en' });
  });

  it('el encabezado enlaza a la tabla y a la página real', () => {
    expect(run([seoPage()])!.links).toMatchObject({ pages: '/p/', live: '/repo/guide/' });
  });

  describe('enlace para editar el archivo', () => {
    function withEdit(edit?: { url: string; path: string }) {
      return inspectorModel({
        tree: { pages: [seoPage()] },
        slug: 'guide',
        locale: 'en',
        links,
        site: 'https://x.dev',
        asset: (src) => src,
        edit,
      })!.links.edit;
    }

    it('es la base de edición más la ruta del archivo, sin barras de sobra', () => {
      expect(withEdit({ url: 'https://gh/edit/main/', path: '/docs/guide.md' })).toBe(
        'https://gh/edit/main/docs/guide.md',
      );
    });

    it('sin base de edición o sin ruta no hay enlace', () => {
      expect(withEdit()).toBeUndefined();
    });
  });

  it('lo publicado: título y descripción con su origen y longitud, canonical, noindex y archivo', () => {
    const page = seoPage();
    page.meta.noindex = true;
    expect(run([page])!.published).toEqual({
      title: 'Guide | Site',
      titleLength: 12,
      titleMin: THRESHOLDS.titleMin,
      titleMax: THRESHOLDS.titleMax,
      titlePx: estimateWidth('Guide | Site', 'title'),
      titleMaxPx: THRESHOLDS.titleMaxPx,
      description: 'A description of the guide.',
      descriptionSource: 'page',
      descriptionLength: 27,
      descriptionMin: THRESHOLDS.descriptionMin,
      descriptionMax: THRESHOLDS.descriptionMax,
      descriptionPx: estimateWidth('A description of the guide.', 'description'),
      descriptionMaxPx: THRESHOLDS.descriptionMaxPx,
      canonical: '/repo/guide/',
      noindex: true,
      sourcePath: 'guide.md',
    });
  });

  it('sin descripción no hay ancho estimado para ella', () => {
    const page = seoPage();
    delete page.meta.description;
    delete page.meta.descriptionLength;
    expect(run([page])!.published.descriptionPx).toBeUndefined();
  });

  it('las vistas previas llevan la URL absoluta y el host, y la imagen OG con su src resuelto', () => {
    const page = seoPage();
    page.meta.ogImage = { src: '/og.png', alt: 'logo', width: 10, height: 5 };
    const { previews } = run([page])!;
    expect(previews.serp).toEqual({
      title: 'Guide | Site',
      url: 'https://x.dev/repo/guide/',
      description: 'A description of the guide.',
      titleMax: THRESHOLDS.titleMax,
      descriptionMax: THRESHOLDS.descriptionMax,
    });
    expect(previews.og).toEqual({
      title: 'Guide',
      description: 'A description of the guide.',
      host: 'x.dev',
      image: { src: '/repo/og.png', alt: 'logo', width: 10, height: 5 },
    });
  });

  it('sin imagen OG no hay imagen en la tarjeta', () => {
    expect(run([seoPage()])!.previews.og.image).toBeUndefined();
  });

  describe('qué arreglar', () => {
    function issue(kind: string, severity: string, extra = {}) {
      return {
        kind,
        severity,
        slug: 'guide',
        locale: 'en',
        message: `m-${kind}`,
        ...extra,
      } as never;
    }

    it('lo más grave primero, y a igual gravedad en el orden en que llegan', () => {
      const page = seoPage({
        issues: [
          issue('description-inherited', 'info'),
          issue('duplicate-title', 'warning'),
          issue('no-h1', 'error'),
          issue('title-too-short', 'warning'),
        ],
      });
      expect(run([page])!.fixes.map((fix) => fix.issue.kind)).toEqual([
        'no-h1',
        'duplicate-title',
        'title-too-short',
        'description-inherited',
      ]);
    });

    it('cada problema lleva su certeza, su límite y cómo verificarlo', () => {
      const page = seoPage({
        issues: [issue('title-too-short', 'warning'), issue('no-h1', 'error')],
      });
      const [noH1, short] = run([page])!.fixes;
      expect(noH1).toMatchObject({ certainty: 'rule', limit: undefined });
      expect(short).toMatchObject({
        certainty: 'heuristic',
        limit: { min: THRESHOLDS.titleMin, max: THRESHOLDS.titleMax },
      });
      expect(short!.verify).toContain(String(THRESHOLDS.titleMin));
    });

    it('un duplicado enlaza al inspector de la página con la que choca y dice su título', () => {
      const other = seoPage({
        slug: 'reference/guide',
        meta: { ...seoPage().meta, title: 'Reference | Site' },
      });
      const page = seoPage({
        issues: [
          issue('duplicate-title', 'warning', {
            related: [{ slug: 'reference/guide', locale: 'en' }],
          }),
        ],
      });
      const [fix] = run([page, other])!.fixes;
      expect(fix!.related).toEqual([
        {
          slug: 'reference/guide',
          href: '/i/?slug=reference/guide&locale=en',
          title: 'Reference | Site',
        },
      ]);
    });

    it('la verificación de un duplicado nombra a las páginas con las que chocaba', () => {
      const page = seoPage({
        issues: [
          issue('duplicate-title', 'warning', {
            related: [{ slug: 'reference/guide', locale: 'en' }],
          }),
        ],
      });
      expect(run([page])!.fixes[0]!.verify).toContain('reference/guide');
    });

    it('una relacionada que no está en el árbol enlaza igual, sin título', () => {
      const page = seoPage({
        issues: [
          issue('duplicate-title', 'warning', { related: [{ slug: 'ghost', locale: 'en' }] }),
        ],
      });
      expect(run([page])!.fixes[0]!.related).toEqual([
        { slug: 'ghost', href: '/i/?slug=ghost&locale=en', title: undefined },
      ]);
    });

    it('sin problemas no hay nada que arreglar', () => {
      expect(run([seoPage()])!.fixes).toEqual([]);
    });
  });

  describe('schemas', () => {
    const org: ResolvedSchema = { schema: { '@type': 'Organization', name: 'A' }, source: 'site' };
    const person: ResolvedSchema = { schema: { '@type': ['Person', 'Thing'] }, source: 'page' };

    it('cada schema con sus @type (una lista o uno), su origen y el JSON formateado', () => {
      const { schemas } = run([seoPage({ schemas: [org, person] })])!;
      expect(schemas.map((schema) => [schema.types, schema.source])).toEqual([
        [['Organization'], 'site'],
        [['Person', 'Thing'], 'page'],
      ]);
      expect(schemas[0]!.json).toBe(JSON.stringify(org.schema, null, 2));
    });

    it('uno del sitio dice en cuántas páginas está: un slug en dos idiomas es una', () => {
      const pages = [
        seoPage({ slug: 'a', locale: 'en', schemas: [org] }),
        seoPage({ slug: 'a', locale: 'es', schemas: [org] }),
        seoPage({ slug: 'b', locale: 'en', schemas: [org] }),
        seoPage({ slug: 'c', locale: 'en', schemas: [] }),
      ];
      expect(run(pages, 'a')!.schemas[0]!.pages).toBe(2);
    });

    it('uno de la página no cuenta páginas', () => {
      expect(run([seoPage({ schemas: [person] })])!.schemas[0]!.pages).toBeUndefined();
    });
  });

  it('los encabezados llevan el recuento por nivel y su esquema con los saltos marcados', () => {
    const page = seoPage({
      headings: [
        { depth: 1, slug: 'a', text: 'Uno' },
        { depth: 2, slug: 'b', text: 'Dos' },
        { depth: 4, slug: 'c', text: 'Cuatro' },
      ],
    });
    const { headings } = run([page])!;
    expect(headings.outline.map((item) => item.skipFrom)).toEqual([undefined, undefined, 2]);
    expect(headings.counts.total).toBe(3);
    expect(headings.counts.problems).toEqual([{ kind: 'skip', from: 2, to: 4 }]);
  });

  describe('cabecera', () => {
    const en = seoPage({
      locale: 'en',
      locales: [
        { locale: 'en', status: 'present', url: '/repo/guide/' },
        { locale: 'es', status: 'present', url: '/repo/es/guide/' },
        { locale: 'fr', status: 'missing', policy: 'link', declared: true },
      ],
      issues: [
        { kind: 'duplicate-title', severity: 'warning', slug: 'guide', locale: 'en', message: 'm' },
        {
          kind: 'description-inherited',
          severity: 'info',
          slug: 'guide',
          locale: 'en',
          message: 'm',
        },
        { kind: 'title-too-short', severity: 'warning', slug: 'guide', locale: 'en', message: 'm' },
      ],
    });
    const es = seoPage({
      locale: 'es',
      issues: [{ kind: 'no-h1', severity: 'error', slug: 'guide', locale: 'es', message: 'm' }],
    });

    it('el conmutador de idioma tiene uno por idioma, con su peor gravedad y su enlace', () => {
      const { locales } = run([en, es])!.header;
      expect(locales).toEqual([
        { locale: 'en', tone: 'warning', current: true, href: undefined },
        { locale: 'es', tone: 'error', current: false, href: '/i/?slug=guide&locale=es' },
        { locale: 'fr', tone: 'missing', current: false, href: undefined },
      ]);
    });

    it('un idioma sin problemas va en «ok»', () => {
      const clean = seoPage({ locale: 'es' });
      const tones = run([en, clean])!.header.locales.map((item) => item.tone);
      expect(tones).toEqual(['warning', 'ok', 'missing']);
    });

    it('cuenta los problemas de ESTE idioma por gravedad, solo los que hay, el peor primero', () => {
      expect(run([en, es])!.header.counts).toEqual([
        { severity: 'warning', count: 2 },
        { severity: 'info', count: 1 },
      ]);
    });

    it('dice en qué idiomas existe de los configurados', () => {
      expect(run([en, es])!.header).toMatchObject({ presentIn: ['en', 'es'], total: 3 });
    });

    it('lleva el título publicado y si es noindex', () => {
      const page = seoPage();
      page.meta.noindex = true;
      expect(run([page])!.header).toMatchObject({ title: 'Guide | Site', noindex: true });
    });
  });

  describe('traducciones', () => {
    const base = seoPage();
    function entries(locale: string) {
      return {
        locales: [
          { locale: 'en', status: 'present', url: '/repo/guide/' },
          { locale: 'es', status: 'present', url: '/repo/es/guide/' },
          { locale: 'fr', status: 'missing', policy: 'link', declared: true },
        ],
        locale,
      };
    }
    const en = seoPage({
      ...entries('en'),
      meta: { ...base.meta, descriptionLength: 93 },
      issues: [],
    } as never);
    const es = seoPage({
      ...entries('es'),
      meta: {
        ...base.meta,
        title: 'Guía | Site',
        description: 'Corta.',
        descriptionLength: THRESHOLDS.descriptionMin,
        descriptionSource: 'site',
      },
      issues: [{ kind: 'no-h1', severity: 'error', slug: 'guide', locale: 'es', message: 'm' }],
    } as never);

    it('una columna por idioma configurado, marcando la actual', () => {
      const columns = run([en, es])!.translations!.columns;
      expect(columns.map((column) => [column.locale, column.current])).toEqual([
        ['en', true],
        ['es', false],
        ['fr', false],
      ]);
    });

    it('la presente lleva sus campos, sus problemas y el enlace a su inspector', () => {
      const column = run([en, es])!.translations!.columns[1]!;
      expect(column).toMatchObject({
        state: 'present',
        title: 'Guía | Site',
        description: 'Corta.',
        descriptionSource: 'site',
        issues: [{ kind: 'no-h1', severity: 'error' }],
        href: '/i/?slug=guide&locale=es',
        tone: 'error',
      });
    });

    it('la propia no enlaza a sí misma', () => {
      expect(run([en, es])!.translations!.columns[0]).toMatchObject({ href: undefined });
    });

    it('marca como «difiere» la celda del idioma que queda en el mínimo mientras otro va bien', () => {
      const [first, second] = run([en, es])!.translations!.columns;
      expect(first).toMatchObject({
        differs: { descriptionLength: false, descriptionSource: false },
      });
      expect(second).toMatchObject({
        descriptionClass: 'edge',
        differs: { descriptionLength: true, descriptionSource: true },
      });
    });

    it('la ausente lleva su política y si está declarada, y no cuenta para comparar', () => {
      expect(run([en, es])!.translations!.columns[2]).toEqual({
        state: 'missing',
        locale: 'fr',
        current: false,
        policy: 'link',
        declared: true,
        tone: 'missing',
      });
    });

    it('una presente sin página en el árbol queda como ausente de datos: solo la URL', () => {
      const column = run([en])!.translations!.columns[1]!;
      expect(column).toMatchObject({
        state: 'unknown',
        locale: 'es',
        url: '/repo/es/guide/',
        tone: 'ok',
      });
    });

    it('con un solo idioma configurado no hay comparación', () => {
      expect(run([seoPage()])!.translations).toBeUndefined();
    });
  });
});
