import type { Locale } from '../../../i18n/locale';
import { HAVE_CELLS, isGood, type HaveCell, type HaveState } from '../../have';
import { HaveColumn } from '../../queries/url-filters';
import type { SeoPage } from '../../tree/types';
import { tagsOf, type PageTag } from './rows';
import { groupBySlug, mainEntry } from './group';

export interface HaveRow {
  slug: string;
  title: string;
  href: string;
  tags: PageTag[];
  cells: Record<HaveColumn, HaveCell>;
}

interface HaveInput {
  locales: readonly Locale[];
  defaultLocale: Locale;
  inspector: (target: { slug: string; locale: Locale }) => string;
}

/** Las columnas, en el orden en que se pintan. */
export const HAVE_COLUMNS: readonly HaveColumn[] = Object.values(HaveColumn);

/** Cuánto pesa cada estado al juntar los idiomas de una página: gana el peor. */
const WEIGHT: Record<HaveState, number> = { own: 0, ok: 0, site: 1, partial: 2, missing: 3, no: 3 };

function worstCell(cells: HaveCell[]): HaveCell {
  return cells.reduce((worst, cell) => (WEIGHT[cell.state] > WEIGHT[worst.state] ? cell : worst));
}

function rowOf(slug: string, entries: SeoPage[], input: HaveInput): HaveRow {
  const { locales, defaultLocale, inspector } = input;
  const main = mainEntry(entries, locales, defaultLocale);
  const cells = Object.fromEntries(
    HAVE_COLUMNS.map((column) => [
      column,
      worstCell(entries.map((entry) => HAVE_CELLS[column](entry, locales))),
    ]),
  ) as Record<HaveColumn, HaveCell>;
  return {
    slug,
    title: main?.meta.title ?? '',
    href: inspector({ slug, locale: main?.locale ?? defaultLocale }),
    tags: tagsOf(entries, locales),
    cells,
  };
}

/** Una fila por página: junta sus idiomas y se queda con el peor. */
export function haveRows(entries: readonly SeoPage[], input: HaveInput): HaveRow[] {
  const bySlug = groupBySlug(entries);
  return [...bySlug].map(([slug, group]) => rowOf(slug, group, input));
}

/** Por columna, cuántas de las páginas dadas lo tienen (propio o cumple) frente al total. */
export function haveCounts(
  rows: readonly HaveRow[],
): Record<HaveColumn, { good: number; total: number }> {
  return Object.fromEntries(
    HAVE_COLUMNS.map((column) => [
      column,
      {
        good: rows.filter((row) => isGood(row.cells[column])).length,
        total: rows.length,
      },
    ]),
  ) as Record<HaveColumn, { good: number; total: number }>;
}

/** Las páginas a las que les falta lo propio de esa columna; sin columna, todas. */
export function lacking(rows: HaveRow[], column: HaveColumn | undefined): HaveRow[] {
  if (!column) return rows;
  return rows.filter((row) => !isGood(row.cells[column]));
}
