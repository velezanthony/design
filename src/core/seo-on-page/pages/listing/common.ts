import type { IssueKind, IssueSeverity, SeoPage } from '../../tree/types';
import { SEVERITY_RANK } from '../../severity';
import { slugsOf } from '../../tree/keys';

/** Un tipo de problema que comparten TODAS las páginas que se están viendo. */
export interface CommonIssue {
  kind: IssueKind;
  /** La peor gravedad con la que aparece. */
  severity: IssueSeverity;
  /** Páginas (slugs) afectadas: siempre todas las vistas. */
  pages: number;
  /** Entradas (página + idioma) afectadas. */
  entries: number;
  /** Cómo arreglarlo, solo si es el mismo texto en todas las incidencias. */
  fix?: string;
}

interface Seen {
  slugs: Set<string>;
  entries: Set<SeoPage>;
  severity: IssueSeverity;
  fixes: Set<string | undefined>;
}

/**
 * Los tipos de problema que afectan al 100 % de las páginas dadas (las ya filtradas): repetirlos en
 * cada fila solo tapa las diferencias entre páginas, así que la pantalla los enseña una vez aparte.
 * Con menos de dos páginas no hay nada «común» (sería quitar todo de la única fila), y los tipos
 * en `ignore` (los que el usuario filtró a propósito) se quedan siempre en las filas. Solo cuentan las
 * gravedades de `severities` (las que se están viendo): un aviso común de algo oculto no se explica.
 */
export function commonIssues(
  entries: readonly SeoPage[],
  {
    ignore = [],
    severities,
  }: { ignore?: readonly IssueKind[]; severities?: readonly IssueSeverity[] } = {},
): CommonIssue[] {
  const slugs = slugsOf(entries);
  if (slugs.size < 2) return [];
  const byKind = new Map<IssueKind, Seen>();
  for (const entry of entries) {
    for (const issue of entry.issues) {
      if (ignore.includes(issue.kind)) continue;
      if (severities && !severities.includes(issue.severity)) continue;
      const seen = byKind.get(issue.kind) ?? {
        slugs: new Set<string>(),
        entries: new Set<SeoPage>(),
        severity: issue.severity,
        fixes: new Set<string | undefined>(),
      };
      seen.slugs.add(entry.slug);
      seen.entries.add(entry);
      if (SEVERITY_RANK[issue.severity] < SEVERITY_RANK[seen.severity])
        seen.severity = issue.severity;
      seen.fixes.add(issue.fix);
      byKind.set(issue.kind, seen);
    }
  }
  return [...byKind]
    .filter(([, seen]) => seen.slugs.size === slugs.size)
    .map(([kind, seen]) => {
      const [fix, ...others] = seen.fixes;
      return {
        kind,
        severity: seen.severity,
        pages: seen.slugs.size,
        entries: seen.entries.size,
        ...(fix !== undefined && others.length === 0 && { fix }),
      };
    })
    .sort((left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]);
}
