import type { Locale } from '../../../i18n/locale';
import type { SeoTree } from '../../tree/types';
import { matrixRows, type MatrixRow } from '../listing/matrix';

/** Cuántas páginas incompletas caben en la tarjeta; el resto se dice con un recuento. */
export const MAX_INCOMPLETE_ROWS = 8;

export interface Coverage {
  /** Páginas (slugs). */
  pages: number;
  /** En todos los idiomas configurados. */
  complete: number;
  /** Les falta alguno (`pages - complete`). */
  partial: number;
  /** Las páginas a las que les falta algún idioma, con sus celdas, hasta `MAX_INCOMPLETE_ROWS`. */
  incomplete: MatrixRow[];
  /** Incompletas que no caben en la tarjeta. */
  moreIncomplete: number;
  /** Completas con hreflang recíproco (las noindex lo omiten). */
  reciprocal: number;
  /** Todas las filas de la matriz, para quien necesite mirar más allá de la tarjeta. */
  rows: MatrixRow[];
  locales: readonly Locale[];
}

interface Input {
  locales: readonly Locale[];
  defaultLocale: Locale;
  inspector: (target: { slug: string; locale: Locale }) => string;
}

/**
 * La cobertura de idiomas del sitio, sobre la misma matriz que la vista «Matriz» de Páginas (una
 * sola definición de «completa»). Con un solo idioma no hay nada que cubrir: `undefined`.
 */
export function coverage(tree: SeoTree, input: Input): Coverage | undefined {
  if (input.locales.length < 2) return undefined;
  const { rows, complete } = matrixRows(tree.pages, input);
  const incomplete = rows.filter((row) => !row.complete);
  return {
    pages: rows.length,
    complete,
    partial: rows.length - complete,
    incomplete: incomplete.slice(0, MAX_INCOMPLETE_ROWS),
    moreIncomplete: Math.max(0, incomplete.length - MAX_INCOMPLETE_ROWS),
    reciprocal: rows.filter((row) => row.complete && row.hreflang === 'reciprocal').length,
    rows,
    locales: input.locales,
  };
}
