import { IssueKind, IssueSeverity, type SeoTree } from '../tree/types';

export interface SeoSummary {
  total: number;
  withIssues: number;
  withoutIssues: number;
  /** Incidencias (no páginas) por tipo; todas las claves presentes aunque valgan 0. */
  byKind: Record<IssueKind, number>;
  bySeverity: Record<IssueSeverity, number>;
}

/** Contadores de la vista general. Con todas las claves siempre, la UI no tiene que comprobar nada. */
export function summarize(tree: SeoTree): SeoSummary {
  const byKind = Object.fromEntries(Object.values(IssueKind).map((kind) => [kind, 0])) as Record<
    IssueKind,
    number
  >;
  const bySeverity = Object.fromEntries(
    Object.values(IssueSeverity).map((severity) => [severity, 0]),
  ) as Record<IssueSeverity, number>;
  for (const issue of tree.pages.flatMap((page) => page.issues)) {
    byKind[issue.kind]++;
    bySeverity[issue.severity]++;
  }
  const withIssues = tree.pages.filter((page) => page.issues.length > 0).length;
  return {
    total: tree.pages.length,
    withIssues,
    withoutIssues: tree.pages.length - withIssues,
    byKind,
    bySeverity,
  };
}
