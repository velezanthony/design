import type { Locale } from '../../../i18n/locale';
import type { Issue, IssueKind, IssueSeverity, SeoPage } from '../../tree/types';
import { RANK, worst, type LocaleTone } from './rows';

/** Una fila de la vista «Por idioma»: una entrada (página + idioma), con lo que se publica de ella. */
export interface EntryRow {
  slug: string;
  locale: Locale;
  href: string;
  title: string;
  titleLength: number;
  descriptionSource: SeoPage['meta']['descriptionSource'];
  descriptionLength: number | undefined;
  /** Sus problemas propios: sin los comunes y solo de las gravedades que se ven. */
  issues: Issue[];
  /** Su peor gravedad (o «ok»), la vea la tabla o no: dice cómo está la entrada de verdad. */
  tone: Exclude<LocaleTone, 'missing'>;
}

interface EntriesInput {
  /** Tipos comunes a todas las páginas: se quitan de las filas (ver `commonIssues`). */
  common: readonly IssueKind[];
  /** Gravedades que se están viendo: los problemas de la fila las respetan (sin ellas, todas). */
  severities?: readonly IssueSeverity[];
  inspector: (target: { slug: string; locale: Locale }) => string;
}

const rank = (row: EntryRow) => (row.tone === 'ok' ? 3 : RANK[row.tone]);

/**
 * Las filas de la vista «Por idioma»: una por entrada, tal como se publica cada idioma. Salen de la
 * peor gravedad a la mejor; en los empates se conserva el orden de entrada (`sort` es estable).
 */
export function entryRows(entries: readonly SeoPage[], input: EntriesInput): EntryRow[] {
  const { common, severities, inspector } = input;
  return entries
    .map((entry): EntryRow => ({
      slug: entry.slug,
      locale: entry.locale,
      href: inspector({ slug: entry.slug, locale: entry.locale }),
      title: entry.meta.title,
      titleLength: entry.meta.titleLength,
      descriptionSource: entry.meta.descriptionSource,
      descriptionLength: entry.meta.descriptionLength,
      issues: entry.issues.filter(
        (issue) =>
          !common.includes(issue.kind) && (!severities || severities.includes(issue.severity)),
      ),
      tone: worst(entry.issues.map((issue) => issue.severity)) ?? 'ok',
    }))
    .sort((a, b) => rank(a) - rank(b));
}
