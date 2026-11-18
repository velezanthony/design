import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../testing/seo-page';
import { selectListing } from '../pages/listing/selection';
import { IssueKind, IssueSeverity, type Issue, type SeoPage, type SeoTree } from '../tree/types';
import { buildReport, JSON_SEPARATOR, type ReportContext } from './report';
import { filterScope, localeScope, pageScope, siteScope } from './scope';

const kindLabels = Object.fromEntries(
  Object.values(IssueKind).map((kind) => [kind, `«${kind}»`]),
) as ReportContext['kindLabels'];

const issue = (kind: IssueKind, severity: IssueSeverity, extra: Partial<Issue> = {}): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: `m:${kind}`,
  ...extra,
});

const page = (slug: string, locale: string, issues: Issue[] = [], extra: Partial<SeoPage> = {}) =>
  seoPage({
    slug,
    locale,
    sourcePath:
      locale === 'en' ? `docs/${slug || 'index'}.md` : `docs/${locale}/${slug || 'index'}.md`,
    issues,
    ...extra,
  });

const meta = (overrides: Partial<SeoPage['meta']>): SeoPage['meta'] => ({
  ...seoPage().meta,
  ...overrides,
});

const ctxOf = (tree: SeoTree): ReportContext => ({
  site: 'SnakeORM',
  locales: ['en', 'es'],
  tree,
  kindLabels,
});

const dup = (related: { slug: string; locale: string }[] = [], fix = 'Cambia `seo.title`.') =>
  issue(IssueKind.DUPLICATE_TITLE, IssueSeverity.WARNING, { fix, related });

/** Cuatro páginas en dos idiomas: dos con título duplicado, una corta, y todas heredan la descripción. */
const tree: SeoTree = {
  pages: [
    ...(['a', 'b'] as const).flatMap((slug) =>
      (['en', 'es'] as const).map((locale) =>
        page(
          slug,
          locale,
          [
            dup(
              [{ slug: slug === 'a' ? 'b' : 'a', locale }],
              `Cambia seo.title de ${slug} (${locale}).`,
            ),
            issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO),
          ],
          {
            meta: meta({
              title: `Mismo | Site`,
              canonical: `/repo/${slug}/`,
              description: 'Del sitio',
              descriptionSource: 'site',
              descriptionLength: 9,
            }),
          },
        ),
      ),
    ),
    page(
      'c',
      'en',
      [
        issue(IssueKind.TITLE_TOO_SHORT, IssueSeverity.WARNING),
        issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO),
      ],
      {
        meta: meta({
          title: 'C',
          titleLength: 1,
          description: 'Del sitio',
          descriptionSource: 'site',
          descriptionLength: 9,
        }),
      },
    ),
    page('c', 'es', [issue(IssueKind.NO_H1, IssueSeverity.ERROR)]),
  ],
};

const report = (scope = siteScope(tree), t = tree) => buildReport(scope, ctxOf(t));
const md = (scope = siteScope(tree), t = tree) => report(scope, t).markdown;
const sections = (text: string) => text.split('\n').filter((line) => line.startsWith('## '));

describe('buildReport: cabecera', () => {
  it('abre con el título, el alcance con sus números y la leyenda de certeza', () => {
    const lines = md().split('\n');
    expect(lines[0]).toBe('# SEO on page — SnakeORM · todo el sitio');
    expect(lines).toContain('Alcance: todo el sitio · 3 páginas · idiomas `en`, `es` (6 entradas)');
    expect(lines).toContain(
      'Certeza: **regla** = hecho comprobable · **heurística** = recomendación (no la cumplas a costa del sentido)',
    );
  });

  it('dice dónde vive el contenido de cada idioma', () => {
    expect(md()).toContain('Contenido: `docs/` (en) · `docs/es/` (es)');
  });

  it('devuelve cuántas páginas y entradas cubre', () => {
    expect(report()).toMatchObject({ pages: 3, entries: 6 });
  });
});

describe('buildReport: orden y secciones', () => {
  it('las secciones salen como «Qué arreglar primero»: el error antes que los avisos y lo informativo al final', () => {
    expect(sections(md())).toEqual([
      expect.stringContaining('1. «no-h1» — error'),
      expect.stringContaining('2. «duplicate-title» — aviso'),
      expect.stringContaining('3. «title-too-short» — aviso'),
      expect.stringContaining('4. «description-inherited» — info'),
      '## No toques',
    ]);
  });

  it('cada cabecera lleva gravedad, certeza, páginas y porcentaje', () => {
    const text = md();
    expect(text).toContain('## 2. «duplicate-title» — aviso — regla — 2 páginas (67 %), en y es');
    expect(text).toContain('## 3. «title-too-short» — aviso — heurística — 1 página (33 %), en');
  });

  it('lo que afecta a todas las páginas lleva el número de entradas en vez de los idiomas', () => {
    expect(md()).toContain(
      '## 4. «description-inherited» — info — regla — 3 páginas (100 %), 5 entradas',
    );
  });

  it('sin problemas en el alcance lo dice y no pide «No toques»', () => {
    const clean: SeoTree = { pages: [page('a', 'en'), page('b', 'en')] };
    const text = md(siteScope(clean), clean);
    expect(text).toContain('Sin problemas en este alcance.');
    expect(sections(text)).toEqual([]);
  });
});

describe('buildReport: detalle de un tipo', () => {
  const duplicate = () => {
    const text = md();
    const start = text.indexOf('## 2.');
    return text.slice(start, text.indexOf('## 3.'));
  };

  it('lista cada fichero con su página e idioma bajo la clave que se toca', () => {
    const text = duplicate();
    expect(text).toContain('- Ficheros y clave: `seo.title` en');
    expect(text).toContain('  - `docs/a.md` (`a`, en)');
    expect(text).toContain('  - `docs/es/b.md` (`b`, es)');
  });

  it('si el valor actual es el mismo en todas, lo dice una vez', () => {
    const text = duplicate();
    expect(text).toContain('- Valor actual: «Mismo | Site» (12 car.');
    expect(text).toContain('(el mismo en todas)');
    expect(text).not.toContain('  - `docs/a.md` (`a`, en) —');
  });

  it('si el valor cambia de una a otra, va en la línea de cada fichero', () => {
    const different: SeoTree = {
      pages: [
        page('a', 'en', [dup()], { meta: meta({ title: 'Uno', titleLength: 3 }) }),
        page('b', 'en', [dup()], { meta: meta({ title: 'Dos', titleLength: 3 }) }),
      ],
    };
    const text = md(siteScope(different), different);
    expect(text).toContain('  - `docs/a.md` (`a`, en) — «Uno» (3 car.');
    expect(text).toContain('  - `docs/b.md` (`b`, en) — «Dos» (3 car.');
    expect(text).not.toContain('- Valor actual:');
  });

  it('explica por qué importa y cómo comprobarlo', () => {
    const text = duplicate();
    expect(text).toContain('- Por qué: Google solo enseña una de las páginas');
    expect(text).toContain('- Verificar: El aviso desaparece de todas las páginas listadas.');
  });

  it('con varias páginas y archivos distintos el arreglo es el general; con una, el suyo', () => {
    expect(duplicate()).toContain('- Arreglo: Dale a cada página un título que la distinga');
    const one: SeoTree = { pages: [page('a', 'en', [dup()])] };
    expect(md(siteScope(one), one)).toContain('- Arreglo: Cambia `seo.title`.');
  });

  it('los problemas de longitud son una recomendación; los demás no llevan restricción inventada', () => {
    const text = md();
    expect(text).toContain('- Restricción: 15–60 caracteres, ≈580 px (recomendación)');
    const h1 = text.slice(text.indexOf('## 1.'), text.indexOf('## 2.'));
    expect(h1).not.toContain('Restricción');
  });

  it('un duplicado pide no cambiar el slug', () => {
    expect(duplicate()).toContain('- Restricción: No cambies el slug ni la URL');
  });

  it('nombra las páginas implicadas que quedan fuera del alcance, con su archivo', () => {
    const scope = localeScope(tree, 'en');
    const only: ReportContext = ctxOf(tree);
    const outside = buildReport(
      { ...scope, entries: scope.entries.filter(({ slug }) => slug === 'a') },
      only,
    );
    expect(outside.markdown).toContain('- Con las que choca, fuera de este alcance:');
    expect(outside.markdown).toContain('  - `docs/b.md` (`b`, en)');
  });

  it('una página externa dice dónde vive su clave', () => {
    const external: SeoTree = {
      pages: [page('changelog', 'en', [dup()], { kind: 'external', sourcePath: 'CHANGELOG.md' })],
    };
    const text = md(siteScope(external), external);
    expect(text).toContain(
      '(`changelog`, en, externa) — `external[].seo.title` en docs.config.mjs',
    );
  });
});

describe('buildReport: lo común se agrupa una vez', () => {
  it('lo que afecta a todas las páginas no lista fichero a fichero: dice las carpetas y la clave', () => {
    const text = md();
    const bulk = text.slice(text.indexOf('## 4.'), text.indexOf('## No toques'));
    expect(bulk).toContain(
      '- Ficheros y clave: `seo.description` en el frontmatter de cada fichero de `docs/` (en) · `docs/es/` (es)',
    );
    expect(bulk).not.toContain('`docs/a.md`');
  });

  it('el valor común va una vez', () => {
    const text = md();
    const bulk = text.slice(text.indexOf('## 4.'), text.indexOf('## No toques'));
    expect(bulk).toContain(
      '- Valor actual: «Del sitio» (heredada del sitio, 9 car.) (el mismo en todas)',
    );
  });

  it('si el valor es el mismo dentro de cada idioma lo dice por idioma y sigue agrupando', () => {
    const bySite: SeoTree = {
      pages: (['a', 'b'] as const).flatMap((slug) =>
        (['en', 'es'] as const).map((locale) =>
          page(slug, locale, [issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO)], {
            meta: meta({
              description: locale === 'en' ? 'Site' : 'Sitio',
              descriptionSource: 'site',
              descriptionLength: 4,
            }),
          }),
        ),
      ),
    };
    const text = md(siteScope(bySite), bySite);
    expect(text).toContain('cada fichero de `docs/` (en) · `docs/es/` (es)');
    expect(text).toContain(
      '- Valor actual: en «Site» (heredada del sitio, 4 car.) · es «Sitio» (heredada del sitio, 4 car.) (el mismo en todas las de cada idioma)',
    );
    expect(text).not.toContain('`docs/a.md`');
  });

  it('una página con un valor por idioma lo dice por idioma, sin «el mismo en todas»', () => {
    const own: SeoTree = {
      pages: [
        page('a', 'en', [dup()], { meta: meta({ title: 'Uno', titleLength: 3 }) }),
        page('a', 'es', [dup()], { meta: meta({ title: 'Uno es', titleLength: 6 }) }),
      ],
    };
    const text = md(pageScope(own, 'a'), own);
    expect(text).toContain('- Valor actual: en «Uno» (3 car., ≈37 px) · es «Uno es» (6 car.');
    expect(text).not.toContain('de cada idioma)');
  });

  it('lo agrupado no se olvida de las páginas externas: su clave vive en docs.config.mjs', () => {
    const mixed: SeoTree = {
      pages: [
        page('a', 'en', [issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO)]),
        page('changelog', 'en', [issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO)], {
          kind: 'external',
          sourcePath: 'CHANGELOG.md',
        }),
      ],
    };
    expect(md(siteScope(mixed), mixed)).toContain(
      'Las externas (`changelog`) no tienen frontmatter: `external[].seo.description` en su entrada de docs.config.mjs',
    );
  });

  it('en una sola página nada es «común»: se listan sus idiomas', () => {
    const text = md(pageScope(tree, 'a'));
    expect(text).toContain('  - `docs/a.md` (`a`, en)');
    expect(text).toContain('  - `docs/es/a.md` (`a`, es)');
  });
});

describe('buildReport: alcances', () => {
  it('una página lleva su tabla por idioma y su contexto, y no habla de porcentajes', () => {
    const text = md(pageScope(tree, 'a'));
    expect(text).toContain('# SEO on page — SnakeORM · `a`');
    expect(text).toContain('Alcance: esta página · idiomas `en`, `es` (2 entradas)');
    expect(text).toContain('| Idioma | Fichero | Título | Descripción |');
    expect(text).toContain('| en | `docs/a.md` | «Mismo \\| Site» (12 car.');
    expect(text).toContain('heredada del sitio (9)');
    expect(text).toContain('## Contexto');
    expect(text).toContain('- Canonical (en): `/repo/a/`');
    expect(text).not.toContain('%');
  });

  it('un idioma cubre solo las entradas de ese idioma', () => {
    const text = md(localeScope(tree, 'es'));
    expect(text).toContain('# SEO on page — SnakeORM · solo `es`');
    expect(text).toContain('Contenido: `docs/es/` (es)');
    expect(text).not.toContain('`docs/a.md`');
  });

  it('el filtro actual respeta las gravedades: por defecto no cuenta lo informativo', () => {
    const selection = selectListing(tree, new URLSearchParams());
    const text = md(filterScope(selection, 'errores + avisos'), tree);
    expect(text).toContain('Alcance: errores + avisos · 3 páginas');
    expect(sections(text).join('\n')).not.toContain('description-inherited');
  });

  it('el filtro por tipo deja solo ese tipo en el informe', () => {
    const selection = selectListing(tree, new URLSearchParams('kind=duplicate-title'));
    const text = md(filterScope(selection, 'tipo'), tree);
    expect(sections(text)).toEqual([expect.stringContaining('«duplicate-title»'), '## No toques']);
  });
});

describe('buildReport: «Qué tiene» filtrado por lo que falta', () => {
  const have = (query: string, t = tree) =>
    buildReport(
      filterScope(selectListing(t, new URLSearchParams(query)), 'sin descripción propia'),
      ctxOf(t),
    );

  it('lista las páginas que no la tienen, con su archivo, la clave que falta y qué hay ahora', () => {
    const { markdown } = have('view=have&lacks=desc');
    expect(markdown).toContain('## Páginas sin descripción propia — 3 páginas');
    expect(markdown).toContain('- Clave: `seo.description` en el frontmatter de cada fichero');
    expect(markdown).toContain('  - `docs/a.md` (`a`, en) — heredada del sitio');
    expect(markdown).toContain('- Restricción: 70–160 caracteres, ≈920 px (recomendación)');
  });

  it('no incluye las páginas que sí la tienen', () => {
    const mixed: SeoTree = {
      pages: [
        page('own', 'en'),
        page('inherits', 'en', [], { meta: meta({ descriptionSource: 'site' }) }),
      ],
    };
    const { markdown, pages } = have('view=have&lacks=desc', mixed);
    expect(pages).toBe(1);
    expect(markdown).toContain('`docs/inherits.md`');
    expect(markdown).not.toContain('`docs/own.md`');
    expect(markdown).toMatch(/^Alcance: .* · 1 página · /m);
  });

  it('en el idioma que falta dice cuál es', () => {
    const lonely: SeoTree = {
      pages: [
        page('x', 'en', [], {
          locales: [
            { locale: 'en', status: 'present', url: '/x/' },
            { locale: 'es', status: 'missing', policy: 'link', declared: false },
          ],
        }),
      ],
    };
    const { markdown } = have('view=have&lacks=i18n', lonely);
    expect(markdown).toContain('## Páginas sin todas las traducciones — 1 página');
    expect(markdown).toContain('— falta es');
  });

  it('si el idioma se sirve de respaldo lo dice así, no como ausente', () => {
    const fallback: SeoTree = {
      pages: [
        page('x', 'en', [], {
          locales: [
            { locale: 'en', status: 'present', url: '/x/' },
            { locale: 'es', status: 'missing', policy: 'fallback', declared: false },
          ],
        }),
      ],
    };
    expect(have('view=have&lacks=i18n', fallback).markdown).toContain('— respaldo es');
  });

  it('una página externa dice dónde vive la clave', () => {
    const external: SeoTree = {
      pages: [
        page('changelog', 'en', [], {
          kind: 'external',
          sourcePath: 'CHANGELOG.md',
          meta: meta({ descriptionSource: 'none', description: undefined }),
        }),
      ],
    };
    expect(have('view=have&lacks=desc', external).markdown).toContain(
      '`external[].seo.description` en docs.config.mjs — sin descripción',
    );
  });

  it('si todas la tienen lo dice', () => {
    const fine: SeoTree = { pages: [page('a', 'en')] };
    expect(have('view=have&lacks=desc', fine).markdown).toContain('Ninguna: todas las páginas');
  });

  it('el JSON lista las páginas con su archivo, clave y valor actual', () => {
    const parsed = JSON.parse(have('view=have&lacks=desc').json.replace(/^```json\n|\n```$/g, ''));
    expect(parsed.lacks).toBe('desc');
    expect(parsed.pages[0]).toEqual({
      slug: 'a',
      locale: 'en',
      file: 'docs/a.md',
      key: 'seo.description',
      current: 'Del sitio',
      detail: 'heredada del sitio',
    });
  });
});

describe('buildReport: bloque JSON', () => {
  const parse = (text: string) => JSON.parse(text.replace(/^```json\n|\n```$/g, ''));

  it('va vallado como json', () => {
    const { json } = report();
    expect(json.startsWith('```json\n')).toBe(true);
    expect(json.endsWith('\n```')).toBe(true);
  });

  it('trae el sitio, el alcance y los límites como recomendación', () => {
    const parsed = parse(report(pageScope(tree, 'a')).json);
    expect(parsed).toMatchObject({
      site: 'SnakeORM',
      scope: 'page:a',
      limits: {
        title: [15, 60],
        titlePx: 580,
        description: [70, 160],
        descriptionPx: 920,
        kind: 'recommendation',
      },
    });
  });

  it('cada problema trae tipo, gravedad, certeza y sus páginas con archivo, clave y valor', () => {
    const parsed = parse(report().json);
    const short = parsed.issues.find((item: { kind: string }) => item.kind === 'title-too-short');
    expect(short).toMatchObject({
      kind: 'title-too-short',
      severity: 'warning',
      certainty: 'heuristic',
    });
    expect(short.pages).toEqual([
      {
        slug: 'c',
        locale: 'en',
        file: 'docs/c.md',
        key: 'seo.title',
        current: 'C',
      },
    ]);
  });

  it('el JSON sí lista cada página aunque el Markdown agrupe lo común', () => {
    const parsed = parse(report().json);
    const inherited = parsed.issues.find(
      (item: { kind: string }) => item.kind === 'description-inherited',
    );
    expect(inherited.pages).toHaveLength(5);
  });

  it('sin valor literal explica con palabras qué hay', () => {
    const parsed = parse(report().json);
    const h1 = parsed.issues.find((item: { kind: string }) => item.kind === 'no-h1');
    expect(h1.pages[0].detail).toBe('sin H1');
  });

  it('lo que no tiene clave ni valor en bruto va como null', () => {
    const parsed = parse(report().json);
    const h1 = parsed.issues.find((item: { kind: string }) => item.kind === 'no-h1');
    expect(h1.pages[0]).toMatchObject({ key: null, current: null });
  });

  it('un idioma que comparte carpeta con otro no la repite en «Contenido»', () => {
    const shared: SeoTree = {
      pages: [
        seoPage({ slug: 'a', locale: 'en', sourcePath: 'docs/a.md' }),
        seoPage({ slug: 'a', locale: 'es', sourcePath: 'docs/a.es.md' }),
      ],
    };
    expect(md(siteScope(shared), shared)).toContain('Contenido: `docs/` (en, es)');
  });

  it('el orden de los problemas es el del Markdown', () => {
    const parsed = parse(report().json);
    expect(parsed.issues.map((item: { kind: string }) => item.kind)).toEqual([
      'no-h1',
      'duplicate-title',
      'title-too-short',
      'description-inherited',
    ]);
  });
});

describe('JSON_SEPARATOR', () => {
  it('separa el Markdown del bloque JSON con una línea en blanco', () => {
    expect(JSON_SEPARATOR).toBe('\n\n');
  });
});
