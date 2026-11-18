import type { Locale } from '../../../i18n/locale';
import type { Issue, IssueKind, IssueSeverity, SeoPage } from '../../tree/types';

/** Una etiqueta de la página. Los textos los pone la UI. */
export type PageTag =
  { kind: 'home' } | { kind: 'only'; locale: Locale } | { kind: 'external' } | { kind: 'noindex' };

/** El color de la insignia de un idioma: su peor gravedad, «ok» sin incidencias, «missing» si no existe. */
export type LocaleTone = IssueSeverity | 'ok' | 'missing';

/** Un idioma de la página: el que existe lleva lo necesario para el detalle desplegable. */
export type LocaleDetail =
  | { locale: Locale; tone: 'missing'; present: false }
  | {
      locale: Locale;
      tone: Exclude<LocaleTone, 'missing'>;
      present: true;
      href: string;
      title: string;
      titleLength: number;
      descriptionSource: SeoPage['meta']['descriptionSource'];
      descriptionLength: number | undefined;
      /** Sus problemas propios: los comunes a todas las páginas no se repiten. */
      issues: Issue[];
    };

export interface PageRow {
  slug: string;
  /** Título y longitud del título: los del idioma por defecto (o el primero que exista). */
  title: string;
  titleLength: number;
  /** Enlace al inspector de esa entrada principal. */
  href: string;
  tags: PageTag[];
  /** Uno por idioma configurado, en el orden de la config. */
  locales: LocaleDetail[];
  /**
   * Cada problema propio una vez, con los idiomas donde ocurre; el más grave primero. `issue` es el
   * representante (el más grave) para pintar la insignia; sin `value` ni `limit` si cambian de un
   * idioma a otro, para no enseñar una medida que solo es cierta en uno.
   */
  issues: { kind: IssueKind; severity: IssueSeverity; locales: Locale[]; issue: Issue }[];
  /** La peor gravedad de la página, contando también los problemas comunes; `undefined` si no tiene. */
  severity: IssueSeverity | undefined;
}

interface RowsInput {
  /** Idiomas de la config, en su orden. */
  locales: readonly Locale[];
  defaultLocale: Locale;
  /** Tipos comunes a todas las páginas: se quitan de las filas (ver `commonIssues`). */
  common: readonly IssueKind[];
  /**
   * Gravedades que se están viendo: los problemas de las filas las respetan (sin ellas, todas). Las
   * insignias de idioma no: dicen cómo está el idioma de verdad, se vea o no el problema.
   */
  severities?: readonly IssueSeverity[];
  inspector: (target: { slug: string; locale: Locale }) => string;
}

export const RANK: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };

export const worst = (severities: readonly IssueSeverity[]): IssueSeverity | undefined =>
  severities.reduce<IssueSeverity | undefined>(
    (acc, severity) => (acc === undefined || RANK[severity] < RANK[acc] ? severity : acc),
    undefined,
  );

/** El problema sin su medida (`value` y `limit`). */
function withoutMeasure(issue: Issue): Issue {
  const rest = { ...issue };
  delete rest.value;
  delete rest.limit;
  return rest;
}

export function tagsOf(entries: readonly SeoPage[], locales: readonly Locale[]): PageTag[] {
  const tags: PageTag[] = [];
  if (entries[0]?.slug === '') tags.push({ kind: 'home' });
  if (entries.length === 1 && locales.length > 1 && entries[0]) {
    tags.push({ kind: 'only', locale: entries[0].locale });
  }
  if (entries.some((entry) => entry.kind === 'external')) tags.push({ kind: 'external' });
  if (entries.some((entry) => entry.meta.noindex)) tags.push({ kind: 'noindex' });
  return tags;
}

function rowOf(slug: string, entries: SeoPage[], input: RowsInput): PageRow {
  const { locales, defaultLocale, common, severities, inspector } = input;
  const byLocale = new Map(entries.map((entry) => [entry.locale, entry]));
  const main = byLocale.get(defaultLocale) ?? locales.map((l) => byLocale.get(l)).find(Boolean);
  const own = (entry: SeoPage) =>
    entry.issues.filter(
      (issue) =>
        !common.includes(issue.kind) && (!severities || severities.includes(issue.severity)),
    );

  const details = locales.map((locale): LocaleDetail => {
    const entry = byLocale.get(locale);
    if (!entry) return { locale, tone: 'missing', present: false };
    return {
      locale,
      tone: worst(entry.issues.map((issue) => issue.severity)) ?? 'ok',
      present: true,
      href: inspector({ slug, locale }),
      title: entry.meta.title,
      titleLength: entry.meta.titleLength,
      descriptionSource: entry.meta.descriptionSource,
      descriptionLength: entry.meta.descriptionLength,
      issues: own(entry),
    };
  });

  const grouped = new Map<IssueKind, { locales: Locale[]; issue: Issue }>();
  for (const locale of locales) {
    const entry = byLocale.get(locale);
    for (const issue of entry ? own(entry) : []) {
      const seen = grouped.get(issue.kind);
      if (!seen) {
        grouped.set(issue.kind, { locales: [locale], issue });
        continue;
      }
      seen.locales.push(locale);
      const worstIssue = RANK[issue.severity] < RANK[seen.issue.severity] ? issue : seen.issue;
      const sameMeasure = issue.value === seen.issue.value && issue.limit === seen.issue.limit;
      seen.issue = sameMeasure ? worstIssue : withoutMeasure(worstIssue);
    }
  }

  return {
    slug,
    title: main?.meta.title ?? '',
    titleLength: main?.meta.titleLength ?? 0,
    href: inspector({ slug, locale: main?.locale ?? defaultLocale }),
    tags: tagsOf(entries, locales),
    locales: details,
    issues: [...grouped]
      .map(([kind, seen]) => ({ kind, severity: seen.issue.severity, ...seen }))
      .sort((a, b) => RANK[a.severity] - RANK[b.severity]),
    severity: worst(entries.flatMap((entry) => entry.issues.map((issue) => issue.severity))),
  };
}

/**
 * Las filas de la tabla: una por página (slug), no por idioma. Cada fila resume sus idiomas, junta
 * los problemas iguales (cada uno una vez, con dónde ocurre) y las filas salen de la peor gravedad
 * a la mejor; en los empates se conserva el orden de entrada. Un `Array.sort` es estable.
 */
export function pageRows(entries: readonly SeoPage[], input: RowsInput): PageRow[] {
  const bySlug = new Map<string, SeoPage[]>();
  for (const entry of entries) bySlug.set(entry.slug, [...(bySlug.get(entry.slug) ?? []), entry]);
  const rank = (row: PageRow) => (row.severity === undefined ? 3 : RANK[row.severity]);
  return [...bySlug]
    .map(([slug, group]) => rowOf(slug, group, input))
    .sort((a, b) => rank(a) - rank(b));
}
