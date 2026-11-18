import type { Locale } from '../../../i18n/locale';
import type { Issue, IssueKind, IssueSeverity, SeoPage } from '../../tree/types';
import { SEVERITY_RANK, worst } from '../../severity';
import { groupBySlug, mainEntry, ownIssues } from './group';

/** Una etiqueta de la página. Los textos los pone la UI. */
export type PageTag =
  | { kind: 'home' }
  | { kind: 'only'; locale: Locale }
  | { kind: 'external' }
  | { kind: 'client' }
  | { kind: 'replaces' }
  | { kind: 'noindex' }
  | { kind: 'fallback'; locales: Locale[] };

/** El color de la insignia de un idioma: su peor gravedad, «ok» sin incidencias, «missing» si no existe. */
export type LocaleTone = IssueSeverity | 'ok' | 'missing';

/** El color de la insignia de una entrada: su peor gravedad, o «missing» si la página no existe en ese idioma. */
export function localeTone(entry: SeoPage): Exclude<LocaleTone, 'missing'>;
export function localeTone(entry: SeoPage | undefined): LocaleTone;
export function localeTone(entry: SeoPage | undefined): LocaleTone {
  if (!entry) return 'missing';
  return worst(entry.issues.map((issue) => issue.severity)) ?? 'ok';
}

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
  /** El representante (el más grave) pinta la insignia; sin `value` ni `limit` si cambian entre idiomas. */
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
  /** Las insignias de idioma ignoran las gravedades vistas: dicen el estado real del idioma. */
  severities?: readonly IssueSeverity[];
  inspector: (target: { slug: string; locale: Locale }) => string;
}

/** El problema sin su medida (`value` y `limit`). */
function withoutMeasure(issue: Issue): Issue {
  const rest = { ...issue };
  delete rest.value;
  delete rest.limit;
  return rest;
}

export function tagsOf(entries: readonly SeoPage[], locales: readonly Locale[]): PageTag[] {
  const tags: PageTag[] = [];
  // Los idiomas que la página no tiene pero se sirven con el texto de otro (política `fallback`).
  const fallback = [
    ...new Set(
      entries.flatMap((entry) =>
        entry.locales
          .filter((cell) => cell.status === 'missing' && cell.policy === 'fallback')
          .map(({ locale }) => locale),
      ),
    ),
  ];
  if (entries[0]?.slug === '') tags.push({ kind: 'home' });
  // Con respaldo la página sí se sirve en los demás idiomas: no es «Solo EN», es «Respaldo ES».
  if (entries.length === 1 && locales.length > 1 && entries[0] && fallback.length === 0) {
    tags.push({ kind: 'only', locale: entries[0].locale });
  }
  if (entries.some((entry) => entry.kind === 'external')) tags.push({ kind: 'external' });
  if (entries.some((entry) => entry.kind === 'client')) tags.push({ kind: 'client' });
  if (entries.some((entry) => entry.replaces)) tags.push({ kind: 'replaces' });
  if (entries.some((entry) => entry.meta.noindex)) tags.push({ kind: 'noindex' });
  if (fallback.length > 0) tags.push({ kind: 'fallback', locales: fallback });
  return tags;
}

function rowOf(slug: string, entries: SeoPage[], input: RowsInput): PageRow {
  const { locales, defaultLocale, common, severities, inspector } = input;
  const byLocale = new Map(entries.map((entry) => [entry.locale, entry]));
  const main = mainEntry(entries, locales, defaultLocale);
  function own(entry: SeoPage) {
    return ownIssues(entry, common, severities);
  }

  const details = locales.map((locale): LocaleDetail => {
    const entry = byLocale.get(locale);
    if (!entry) return { locale, tone: 'missing', present: false };
    return {
      locale,
      tone: localeTone(entry),
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
      const worstIssue =
        SEVERITY_RANK[issue.severity] < SEVERITY_RANK[seen.issue.severity] ? issue : seen.issue;
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
      .sort((left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]),
    severity: worst(entries.flatMap((entry) => entry.issues.map((issue) => issue.severity))),
  };
}

/** Una fila por página (slug), no por idioma; peor gravedad primero y empates en orden de entrada. */
export function pageRows(entries: readonly SeoPage[], input: RowsInput): PageRow[] {
  const bySlug = groupBySlug(entries);
  function rank(row: PageRow) {
    return row.severity === undefined ? 3 : SEVERITY_RANK[row.severity];
  }
  return [...bySlug]
    .map(([slug, group]) => rowOf(slug, group, input))
    .sort((left, right) => rank(left) - rank(right));
}
