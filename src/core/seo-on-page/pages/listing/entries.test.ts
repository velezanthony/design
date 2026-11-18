import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage } from '../../tree/types';
import { entryRows } from './entries';

function issue(kind: IssueKind, severity: IssueSeverity): Issue {
  return {
    kind,
    severity,
    slug: 'x',
    locale: 'en',
    message: kind,
  };
}
function warn(kind: IssueKind = IssueKind.DUPLICATE_TITLE) {
  return issue(kind, IssueSeverity.WARNING);
}
function info(kind: IssueKind = IssueKind.DESCRIPTION_INHERITED) {
  return issue(kind, IssueSeverity.INFO);
}

function rows(entries: SeoPage[], common: IssueKind[] = [], severities?: IssueSeverity[]) {
  return entryRows(entries, {
    common,
    ...(severities && { severities }),
    inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  });
}

describe('entryRows', () => {
  it('una fila por entrada página + idioma, no por página', () => {
    const result = rows([
      seoPage({ slug: 'a', locale: 'en' }),
      seoPage({ slug: 'a', locale: 'es' }),
      seoPage({ slug: 'b', locale: 'en' }),
    ]);
    expect(result.map(({ slug, locale }) => `${slug}/${locale}`)).toEqual(['a/en', 'a/es', 'b/en']);
  });

  it('lleva lo que enseña la tabla: título, descripción y enlace a SU inspector', () => {
    const [row] = rows([
      seoPage({
        slug: 'a',
        locale: 'es',
        meta: {
          ...seoPage().meta,
          title: 'Hola | Sitio',
          titleLength: 12,
          descriptionSource: 'site',
          descriptionLength: 93,
        },
      }),
    ]);
    expect(row).toMatchObject({
      title: 'Hola | Sitio',
      titleLength: 12,
      descriptionSource: 'site',
      descriptionLength: 93,
      href: '/i/?slug=a&locale=es',
    });
  });

  it('quita los problemas comunes y respeta las gravedades que se ven', () => {
    const [row] = rows(
      [
        seoPage({
          issues: [warn(), warn(IssueKind.NO_H1), info(), info(IssueKind.TRANSLATION_MISSING)],
        }),
      ],
      [IssueKind.NO_H1],
      [IssueSeverity.WARNING],
    );
    expect(row?.issues.map(({ kind }) => kind)).toEqual([IssueKind.DUPLICATE_TITLE]);
  });

  it('el tono es la peor gravedad de la entrada, vea o no sus problemas', () => {
    const [shown, hidden, clean] = rows(
      [
        seoPage({ slug: 'a', issues: [info(), warn()] }),
        seoPage({ slug: 'b', issues: [warn()] }),
        seoPage({ slug: 'c' }),
      ],
      [],
      [IssueSeverity.INFO],
    );
    expect(shown?.tone).toBe('warning');
    expect(hidden?.tone).toBe('warning');
    expect(clean?.tone).toBe('ok');
  });

  it('ordena de la peor gravedad a la mejor y respeta el orden en los empates', () => {
    const result = rows([
      seoPage({ slug: 'clean' }),
      seoPage({ slug: 'i', issues: [info()] }),
      seoPage({ slug: 'w1', issues: [warn()] }),
      seoPage({ slug: 'e', issues: [issue(IssueKind.NO_H1, IssueSeverity.ERROR)] }),
      seoPage({ slug: 'w2', issues: [warn()] }),
    ]);
    expect(result.map(({ slug }) => slug)).toEqual(['e', 'w1', 'w2', 'i', 'clean']);
  });
});
