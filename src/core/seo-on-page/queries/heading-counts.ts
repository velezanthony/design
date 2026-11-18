import type { HeadingNode } from '../tree/types';
import { outline } from './outline';

/** Lo que está mal en la estructura de encabezados de una página. */
export type HeadingProblem =
  | { kind: 'no-h1' }
  | { kind: 'multiple-h1'; count: number }
  | { kind: 'skip'; from: number; to: number };

export interface HeadingCounts {
  /** Siempre los seis, de H1 a H6, aunque estén a cero. */
  levels: { depth: number; count: number }[];
  /** Los encabezados contados (solo H1–H6). */
  total: number;
  /** Vacío si la estructura está bien: un solo H1 y ningún salto de nivel. */
  problems: HeadingProblem[];
}

const DEPTHS = [1, 2, 3, 4, 5, 6] as const;

/** El contador por nivel y el estado de la estructura; el salto de nivel es el de `outline`. */
export function headingCounts(headings: readonly HeadingNode[]): HeadingCounts {
  const levels = DEPTHS.map((depth) => ({
    depth,
    count: headings.filter((heading) => heading.depth === depth).length,
  }));
  const h1 = levels[0]!.count;
  const problems: HeadingProblem[] = [];
  if (h1 === 0) problems.push({ kind: 'no-h1' });
  if (h1 > 1) problems.push({ kind: 'multiple-h1', count: h1 });
  for (const item of outline(headings)) {
    if (item.skipFrom !== undefined) {
      problems.push({ kind: 'skip', from: item.skipFrom, to: item.depth });
    }
  }
  return { levels, total: levels.reduce((sum, level) => sum + level.count, 0), problems };
}
