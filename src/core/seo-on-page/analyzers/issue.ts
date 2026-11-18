import { CATALOG } from '../catalog';
import type { IssueKind, Issue } from '../tree/types';

type Extra = Partial<Pick<Issue, 'severity' | 'value' | 'limit' | 'related' | 'fix'>>;

/** Construye un `Issue` de la página con la gravedad por defecto de su tipo (salvo que se fuerce). */
export function makeIssue(
  kind: IssueKind,
  page: { slug: string; locale: string },
  message: string,
  extra: Extra = {},
): Issue {
  return {
    kind,
    severity: extra.severity ?? CATALOG[kind].severity,
    slug: page.slug,
    locale: page.locale,
    message,
    ...(extra.fix !== undefined && { fix: extra.fix }),
    ...(extra.value !== undefined && { value: extra.value }),
    ...(extra.limit !== undefined && { limit: extra.limit }),
    ...(extra.related !== undefined && { related: extra.related }),
  };
}
