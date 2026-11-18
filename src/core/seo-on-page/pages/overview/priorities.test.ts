import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage } from '../../tree/types';
import { fixPriorities } from './priorities';

const issue = (kind: IssueKind, severity: IssueSeverity, extra: Partial<Issue> = {}): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: kind,
  ...extra,
});

const entry = (slug: string, issues: Issue[], locale = 'en'): SeoPage =>
  seoPage({ slug, locale, issues });

const input = {
  locales: ['en', 'es'],
  inspector: ({ slug, locale }: { slug: string; locale: string }) => `/i/${slug}/${locale}`,
};

const rank = (pages: SeoPage[]) => fixPriorities({ pages }, input).map((p) => p.kind);

describe('fixPriorities', () => {
  it('sin incidencias no hay nada que arreglar', () => {
    expect(rank([entry('a', [])])).toEqual([]);
  });

  it('ordena por gravedad antes que por alcance: un aviso en una página va antes que una info en muchas', () => {
    const pages = [
      entry('a', [issue('title-too-short', 'warning'), issue('translation-missing', 'info')]),
      entry('b', [issue('translation-missing', 'info')]),
      entry('c', [issue('no-h1', 'error')]),
    ];
    expect(rank(pages)).toEqual(['no-h1', 'title-too-short', 'translation-missing']);
  });

  it('a igual gravedad, primero lo que toca a más páginas', () => {
    const pages = [
      entry('a', [issue('title-too-short', 'warning'), issue('duplicate-title', 'warning')]),
      entry('b', [issue('duplicate-title', 'warning')]),
      entry('c', []),
    ];
    expect(rank(pages)).toEqual(['duplicate-title', 'title-too-short']);
  });

  it('lo que afecta a todas las páginas va al final de su gravedad: es deuda en bloque, no una tarea', () => {
    const pages = [
      entry('a', [issue('description-inherited', 'info'), issue('translation-missing', 'info')]),
      entry('b', [issue('description-inherited', 'info')]),
    ];
    expect(rank(pages)).toEqual(['translation-missing', 'description-inherited']);
  });

  it('con una sola página en el sitio nada es «en bloque»', () => {
    expect(rank([entry('a', [issue('no-h1', 'info'), issue('heading-skip', 'info')])])).toEqual([
      'no-h1',
      'heading-skip',
    ]);
  });

  it('cuenta páginas (no idiomas), su porcentaje y los idiomas donde ocurre', () => {
    const pages = [
      entry('a', [issue('duplicate-title', 'warning')]),
      entry('a', [issue('duplicate-title', 'warning')], 'es'),
      entry('b', []),
      entry('c', []),
      entry('d', []),
    ];
    const [first] = fixPriorities({ pages }, input);
    expect(first).toMatchObject({
      pages: 1,
      entries: 2,
      percent: 25,
      locales: ['en', 'es'],
      certainty: 'rule',
    });
  });

  it('los idiomas salen en el orden de la config, no en el del árbol', () => {
    const pages = [
      entry('a', [issue('no-h1', 'error')], 'es'),
      entry('a', [issue('no-h1', 'error')], 'en'),
    ];
    expect(fixPriorities({ pages }, input)[0]!.locales).toEqual(['en', 'es']);
  });

  it('enlaza cada página afectada a su inspector, en el primer idioma donde ocurre', () => {
    const pages = [entry('a', [issue('no-h1', 'error')], 'es'), entry('b', [])];
    expect(fixPriorities({ pages }, input)[0]!.affected).toEqual([{ slug: 'a', href: '/i/a/es' }]);
  });

  it('con demasiadas páginas no las lista: el recuento y el enlace a la tabla bastan', () => {
    const pages = Array.from({ length: 6 }, (_, n) => entry(`p${n}`, [issue('no-h1', 'error')]));
    expect(fixPriorities({ pages }, input)[0]!.affected).toEqual([]);
  });

  it('el arreglo es el de la primera incidencia', () => {
    const pages = [
      entry('a', [issue('no-h1', 'error', { fix: 'Añade un H1' })]),
      entry('b', [issue('no-h1', 'error', { fix: 'Otro' })]),
    ];
    expect(fixPriorities({ pages }, input)[0]!.fix).toBe('Añade un H1');
  });

  it('el porcentaje de algo que afecta a muy pocas páginas no se queda en 0', () => {
    const pages = [
      entry('a', [issue('no-h1', 'error')]),
      ...Array.from({ length: 300 }, (_, n) => entry(`p${n}`, [])),
    ];
    expect(fixPriorities({ pages }, input)[0]!.percent).toBe(1);
  });
});
