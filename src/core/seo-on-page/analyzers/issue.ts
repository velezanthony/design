import { IssueKind, IssueSeverity, type Issue } from '../tree/types';

/** Gravedad por defecto de cada tipo; `translation-missing` la decide su analizador según la política. */
const SEVERITY: Record<IssueKind, IssueSeverity> = {
  [IssueKind.TITLE_TOO_LONG]: IssueSeverity.WARNING,
  [IssueKind.TITLE_TOO_SHORT]: IssueSeverity.WARNING,
  [IssueKind.DESCRIPTION_MISSING]: IssueSeverity.WARNING,
  [IssueKind.DESCRIPTION_INHERITED]: IssueSeverity.INFO,
  [IssueKind.DESCRIPTION_TOO_LONG]: IssueSeverity.WARNING,
  [IssueKind.DESCRIPTION_TOO_SHORT]: IssueSeverity.INFO,
  [IssueKind.DUPLICATE_TITLE]: IssueSeverity.WARNING,
  [IssueKind.DUPLICATE_DESCRIPTION]: IssueSeverity.WARNING,
  [IssueKind.NO_H1]: IssueSeverity.ERROR,
  [IssueKind.MULTIPLE_H1]: IssueSeverity.WARNING,
  [IssueKind.HEADING_SKIP]: IssueSeverity.WARNING,
  [IssueKind.TRANSLATION_MISSING]: IssueSeverity.WARNING,
  [IssueKind.TRANSLATION_POLICY_CONFLICT]: IssueSeverity.ERROR,
};

type Extra = Partial<Pick<Issue, 'severity' | 'value' | 'limit' | 'related'>>;

/** Construye un `Issue` de la página con la gravedad por defecto de su tipo (salvo que se fuerce). */
export function makeIssue(
  kind: IssueKind,
  page: { slug: string; locale: string },
  message: string,
  extra: Extra = {},
): Issue {
  return {
    kind,
    severity: extra.severity ?? SEVERITY[kind],
    slug: page.slug,
    locale: page.locale,
    message,
    ...(extra.value !== undefined && { value: extra.value }),
    ...(extra.limit !== undefined && { limit: extra.limit }),
    ...(extra.related !== undefined && { related: extra.related }),
  };
}
