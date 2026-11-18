import { IssueKind } from './tree/types';

/** `rule` es un hecho; `heuristic` una recomendación (Google no fija límites, recorta por ancho). */
export type Certainty = 'rule' | 'heuristic';

const HEURISTICS: ReadonlySet<IssueKind> = new Set([
  IssueKind.TITLE_TOO_LONG,
  IssueKind.TITLE_TOO_SHORT,
  IssueKind.DESCRIPTION_TOO_LONG,
  IssueKind.DESCRIPTION_TOO_SHORT,
  IssueKind.OG_IMAGE_SIZE,
]);

export function certaintyOf(kind: IssueKind): Certainty {
  return HEURISTICS.has(kind) ? 'heuristic' : 'rule';
}
