import { IssueKind } from './tree/types';

/**
 * Cuánto se fía uno del aviso: `rule` es un hecho (dos títulos iguales, falta una traducción) y
 * `heuristic` una recomendación (las longitudes: Google no fija un límite, recorta por ancho).
 */
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
