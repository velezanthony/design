import type { Locale } from '../../../i18n/locale';
import type { Issue, IssueKind, IssueSeverity, SeoPage } from '../../tree/types';

/** Los idiomas de cada página juntos, por slug, en el orden en que llegan. */
export function groupBySlug(entries: readonly SeoPage[]): Map<string, SeoPage[]> {
  const groups = new Map<string, SeoPage[]>();
  for (const entry of entries) groups.set(entry.slug, [...(groups.get(entry.slug) ?? []), entry]);
  return groups;
}

/** La entrada que representa a la página: la del idioma por defecto o, sin ella, la del primero que haya. */
export function mainEntry(
  entries: readonly SeoPage[],
  locales: readonly Locale[],
  defaultLocale: Locale,
): SeoPage | undefined {
  const byLocale = new Map(entries.map((entry) => [entry.locale, entry]));
  return byLocale.get(defaultLocale) ?? locales.map((locale) => byLocale.get(locale)).find(Boolean);
}

/** Los problemas propios de una entrada: sin los comunes a todas y, si se piden, solo de esas gravedades. */
export function ownIssues(
  entry: SeoPage,
  common: readonly IssueKind[],
  severities?: readonly IssueSeverity[],
): Issue[] {
  return entry.issues.filter(
    (issue) => !common.includes(issue.kind) && (!severities || severities.includes(issue.severity)),
  );
}
