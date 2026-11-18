import { THRESHOLDS } from '../thresholds';
import { IssueKind, type Issue, type SeoPageFacts } from '../tree/types';
import { fixFor } from './fixes';
import { makeIssue } from './issue';

/** Título y descripción de UNA página contra los límites del resultado de búsqueda. */
export function analyzeMetadata(page: SeoPageFacts): Issue[] {
  const { meta } = page;
  const fix = (kind: IssueKind) => fixFor(kind, page);
  const issues: Issue[] = [];

  if (meta.titleLength > THRESHOLDS.titleMax) {
    issues.push(
      makeIssue(IssueKind.TITLE_TOO_LONG, page, 'El título se recorta en los resultados.', {
        value: meta.titleLength,
        limit: THRESHOLDS.titleMax,
        fix: fix(IssueKind.TITLE_TOO_LONG),
      }),
    );
  } else if (meta.titleLength < THRESHOLDS.titleMin) {
    issues.push(
      makeIssue(
        IssueKind.TITLE_TOO_SHORT,
        page,
        'El título es demasiado corto para describir la página.',
        {
          value: meta.titleLength,
          limit: THRESHOLDS.titleMin,
          fix: fix(IssueKind.TITLE_TOO_SHORT),
        },
      ),
    );
  }

  if (meta.descriptionSource === 'none') {
    issues.push(
      makeIssue(IssueKind.DESCRIPTION_MISSING, page, 'La página no tiene descripción.', {
        fix: fix(IssueKind.DESCRIPTION_MISSING),
      }),
    );
  } else if (meta.descriptionSource === 'site') {
    // La del sitio ya se juzga una vez; medirla en cada página repetiría el mismo aviso.
    issues.push(
      makeIssue(
        IssueKind.DESCRIPTION_INHERITED,
        page,
        'La descripción es la del sitio, no una propia.',
        { fix: fix(IssueKind.DESCRIPTION_INHERITED) },
      ),
    );
  } else if (meta.descriptionLength !== undefined) {
    if (meta.descriptionLength > THRESHOLDS.descriptionMax) {
      issues.push(
        makeIssue(
          IssueKind.DESCRIPTION_TOO_LONG,
          page,
          'La descripción se recorta en los resultados.',
          {
            value: meta.descriptionLength,
            limit: THRESHOLDS.descriptionMax,
            fix: fix(IssueKind.DESCRIPTION_TOO_LONG),
          },
        ),
      );
    } else if (meta.descriptionLength < THRESHOLDS.descriptionMin) {
      issues.push(
        makeIssue(
          IssueKind.DESCRIPTION_TOO_SHORT,
          page,
          'La descripción es corta y el buscador puede sustituirla.',
          {
            value: meta.descriptionLength,
            limit: THRESHOLDS.descriptionMin,
            fix: fix(IssueKind.DESCRIPTION_TOO_SHORT),
          },
        ),
      );
    }
  }
  return issues;
}

/** Agrupa por clave (idioma + texto) las páginas que la comparten. */
function groupBy(pages: SeoPageFacts[], keyOf: (page: SeoPageFacts) => string | undefined) {
  const groups = new Map<string, SeoPageFacts[]>();
  for (const page of pages) {
    const key = keyOf(page);
    if (key !== undefined) groups.set(key, [...(groups.get(key) ?? []), page]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

/** El resto del grupo: las páginas con las que choca `page`, sin ella misma. */
const othersIn = (group: SeoPageFacts[], page: SeoPageFacts) =>
  group.filter((other) => other !== page).map(({ slug, locale }) => ({ slug, locale }));

/**
 * Títulos y descripciones repetidos entre páginas del MISMO idioma (el mismo título en `en` y `es`
 * es lo normal). Las `noindex` no compiten en los resultados, así que no cuentan; y la descripción
 * heredada del sitio ya tiene su propio aviso, no es un «duplicado».
 */
export function analyzeDuplicates(pages: SeoPageFacts[]): Issue[] {
  const indexable = pages.filter((page) => !page.meta.noindex);
  // `\u0000` separa idioma y texto sin que ningún texto real pueda confundirse con la clave.
  const key = (page: SeoPageFacts, text: string) => `${page.locale}\u0000${text}`;
  const titles = groupBy(indexable, (page) => key(page, page.meta.title));
  const descriptions = groupBy(indexable, (page) =>
    page.meta.descriptionSource === 'page' && page.meta.description !== undefined
      ? key(page, page.meta.description)
      : undefined,
  );
  return [
    ...titles.flatMap((group) =>
      group.map((page) =>
        makeIssue(
          IssueKind.DUPLICATE_TITLE,
          page,
          'Otra página del mismo idioma tiene el mismo título.',
          {
            value: group.length,
            related: othersIn(group, page),
            fix: fixFor(IssueKind.DUPLICATE_TITLE, page, { related: othersIn(group, page) }),
          },
        ),
      ),
    ),
    ...descriptions.flatMap((group) =>
      group.map((page) =>
        makeIssue(
          IssueKind.DUPLICATE_DESCRIPTION,
          page,
          'Otra página del mismo idioma tiene la misma descripción.',
          {
            value: group.length,
            related: othersIn(group, page),
            fix: fixFor(IssueKind.DUPLICATE_DESCRIPTION, page, { related: othersIn(group, page) }),
          },
        ),
      ),
    ),
  ];
}
