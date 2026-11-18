import { IssueSeverity, type SeoPage } from '../../tree/types';
import { ALL_SEVERITIES } from '../../severity';

/** Cuántas páginas (slugs) y entradas (página + idioma) tienen alguna incidencia de una gravedad. */
export type SeverityCounts = Record<IssueSeverity, { pages: number; entries: number }>;

/** Los números de las fichas de gravedad: la vista por idioma cuenta entradas; las demás, páginas. */
export function severityCounts(entries: readonly SeoPage[]): SeverityCounts {
  return Object.fromEntries(
    ALL_SEVERITIES.map((severity) => {
      const hit = entries.filter((entry) =>
        entry.issues.some((issue) => issue.severity === severity),
      );
      return [
        severity,
        { pages: new Set(hit.map((entry) => entry.slug)).size, entries: hit.length },
      ];
    }),
  ) as SeverityCounts;
}
