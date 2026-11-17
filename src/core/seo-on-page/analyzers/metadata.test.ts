import { describe, expect, it } from 'vitest';
import { THRESHOLDS } from '../thresholds';
import type { MetaNode, SeoPageFacts } from '../tree/types';
import { analyzeDuplicates, analyzeMetadata } from './metadata';

const facts = (slug: string, meta: Partial<MetaNode> = {}, locale = 'en'): SeoPageFacts => ({
  slug,
  locale,
  title: slug,
  kind: 'native',
  sourcePath: `${slug}.md`,
  meta: {
    title: `Title of ${slug}`,
    titleLength: 30,
    descriptionSource: 'page',
    description: `Description of ${slug}`,
    descriptionLength: 100,
    ogTitle: slug,
    canonical: `/${slug}/`,
    noindex: false,
    ...meta,
  },
  headings: [],
  locales: [],
  policy: 'link',
});

const kinds = (page: SeoPageFacts) => analyzeMetadata(page).map((issue) => issue.kind);

describe('analyzeMetadata: título', () => {
  it('largo: avisa con la longitud medida y el límite', () => {
    const [issue] = analyzeMetadata(facts('a', { titleLength: 72 }));
    expect(issue).toMatchObject({
      kind: 'title-too-long',
      severity: 'warning',
      slug: 'a',
      locale: 'en',
      value: 72,
      limit: THRESHOLDS.titleMax,
    });
    expect(issue.message).toEqual(expect.any(String));
  });

  it('justo en el límite no avisa', () => {
    expect(kinds(facts('a', { titleLength: THRESHOLDS.titleMax }))).toEqual([]);
  });

  it('corto: avisa', () => {
    const [issue] = analyzeMetadata(facts('a', { titleLength: 5 }));
    expect(issue).toMatchObject({ kind: 'title-too-short', value: 5, limit: THRESHOLDS.titleMin });
  });

  it('justo en el mínimo no avisa', () => {
    expect(kinds(facts('a', { titleLength: THRESHOLDS.titleMin }))).toEqual([]);
  });
});

describe('analyzeMetadata: descripción', () => {
  it('ausente: warning', () => {
    const page = facts('a', { descriptionSource: 'none', descriptionLength: undefined });
    expect(analyzeMetadata(page)).toMatchObject([
      { kind: 'description-missing', severity: 'warning' },
    ]);
  });

  it('heredada del sitio: info, y no se mide su longitud', () => {
    const page = facts('a', { descriptionSource: 'site', descriptionLength: 500 });
    expect(analyzeMetadata(page)).toMatchObject([
      { kind: 'description-inherited', severity: 'info' },
    ]);
  });

  it('larga: avisa con valor y límite', () => {
    const [issue] = analyzeMetadata(facts('a', { descriptionLength: 190 }));
    expect(issue).toMatchObject({
      kind: 'description-too-long',
      value: 190,
      limit: THRESHOLDS.descriptionMax,
    });
  });

  it('corta: avisa con valor y límite', () => {
    const [issue] = analyzeMetadata(facts('a', { descriptionLength: 20 }));
    expect(issue).toMatchObject({
      kind: 'description-too-short',
      value: 20,
      limit: THRESHOLDS.descriptionMin,
    });
  });

  it('dentro del rango no avisa', () => {
    expect(kinds(facts('a', { descriptionLength: THRESHOLDS.descriptionMin }))).toEqual([]);
    expect(kinds(facts('a', { descriptionLength: THRESHOLDS.descriptionMax }))).toEqual([]);
  });
});

describe('analyzeDuplicates', () => {
  it('título repetido entre páginas del mismo idioma: una incidencia por página', () => {
    const pages = [
      facts('a', { title: 'Same title here' }),
      facts('b', { title: 'Same title here' }),
      facts('c', { title: 'Other title here' }),
    ];
    expect(analyzeDuplicates(pages)).toMatchObject([
      { kind: 'duplicate-title', slug: 'a', locale: 'en', value: 2 },
      { kind: 'duplicate-title', slug: 'b', locale: 'en', value: 2 },
    ]);
  });

  it('cada duplicado nombra las OTRAS páginas con las que choca, sin incluirse', () => {
    const pages = [
      facts('a', { title: 'Same title here' }),
      facts('b', { title: 'Same title here' }),
      facts('c', { title: 'Same title here' }),
    ];
    const [first] = analyzeDuplicates(pages);
    expect(first).toMatchObject({ slug: 'a', value: 3 });
    expect(first?.related).toEqual([
      { slug: 'b', locale: 'en' },
      { slug: 'c', locale: 'en' },
    ]);
  });

  it('una descripción duplicada también nombra la otra página', () => {
    const pages = [
      facts('a', { description: 'Same text' }),
      facts('b', { description: 'Same text' }),
    ];
    expect(analyzeDuplicates(pages).map((issue) => issue.related)).toEqual([
      [{ slug: 'b', locale: 'en' }],
      [{ slug: 'a', locale: 'en' }],
    ]);
  });

  it('el mismo título en idiomas distintos NO es duplicado', () => {
    const pages = [facts('a', { title: 'Same' }, 'en'), facts('a', { title: 'Same' }, 'es')];
    expect(analyzeDuplicates(pages)).toEqual([]);
  });

  it('descripción repetida propia: duplicado; la heredada no (ya es «inherited»)', () => {
    const own = [
      facts('a', { description: 'Same text' }),
      facts('b', { description: 'Same text' }),
    ];
    expect(analyzeDuplicates(own).map((issue) => issue.kind)).toEqual([
      'duplicate-description',
      'duplicate-description',
    ]);
    const inherited = [
      facts('a', { description: 'Site', descriptionSource: 'site' }),
      facts('b', { description: 'Site', descriptionSource: 'site' }),
    ];
    expect(analyzeDuplicates(inherited)).toEqual([]);
  });

  it('las páginas noindex no compiten en los resultados: no cuentan', () => {
    const pages = [
      facts('a', { title: 'Same title here' }),
      facts('b', { title: 'Same title here', noindex: true }),
    ];
    expect(analyzeDuplicates(pages)).toEqual([]);
  });
});

describe('analyzeMetadata: cómo arreglarlo', () => {
  it('cada problema lleva su arreglo, con la clave y el archivo de la página', () => {
    const [title] = analyzeMetadata(facts('a', { titleLength: 72 }));
    expect(title!.fix).toContain('seo.title');
    expect(title!.fix).toContain('a.md');
    const [description] = analyzeMetadata(facts('a', { descriptionSource: 'none' }));
    expect(description!.fix).toContain('seo.description');
  });

  it('en una página externa apunta a docs.config.mjs', () => {
    const external = { ...facts('changelog', { titleLength: 72 }), kind: 'external' as const };
    const [issue] = analyzeMetadata(external);
    expect(issue!.fix).toContain('external[].seo.title');
    expect(issue!.fix).toContain('docs.config.mjs');
  });

  it('un duplicado nombra con quién choca', () => {
    const issues = analyzeDuplicates([facts('a'), { ...facts('b'), meta: facts('a').meta }]);
    const titleIssue = issues.find(
      (issue) => issue.kind === 'duplicate-title' && issue.slug === 'a',
    );
    expect(titleIssue!.fix).toContain('«b»');
  });
});
