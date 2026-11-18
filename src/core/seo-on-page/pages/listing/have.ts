import type { Locale } from '../../../i18n/locale';
import { HaveColumn } from '../../queries/url-filters';
import { IssueKind, type SeoPage } from '../../tree/types';
import { localeCells } from './matrix';
import { tagsOf, type PageTag } from './rows';
import { groupBySlug, mainEntry } from './group';

/**
 * Qué tiene una página en una columna: `own` lo dice ella, `site` lo hereda del sitio (no es un
 * fallo: es lo que se publica si no dice nada), `missing` falta, `partial` se cubre con un respaldo,
 * `ok` cumple y `no` es una exclusión (noindex).
 */
export type HaveState = 'own' | 'site' | 'missing' | 'partial' | 'ok' | 'no';

export interface HaveCell {
  state: HaveState;
  /** Lo que acompaña al estado: el tipo del schema propio o los idiomas que faltan / se sirven de respaldo. */
  detail?: string;
}

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

/** Lo que falta, dicho tras «sin»: la frase de cada columna de «Qué tiene» (la del recuento y la del informe). */
export const LACKS_PHRASES: Record<HaveColumn, string> = {
  desc: 'descripción propia',
  schema: 'schema propio',
  og: 'imagen OG propia',
  h1: 'un H1 único',
  i18n: 'todas las traducciones',
  index: 'indexación',
};

/** Lo que cuenta como «lo tiene»: lo propio y lo que cumple. Lo heredado no: es justo lo que se busca. */
const GOOD: readonly HaveState[] = ['own', 'ok'];

/** Cuánto pesa cada estado al juntar los idiomas de una página: gana el peor. */
const WEIGHT: Record<HaveState, number> = { own: 0, ok: 0, site: 1, partial: 2, missing: 3, no: 3 };

const fromSource = (source: 'page' | 'site' | 'none'): HaveCell => ({
  state: { page: 'own', site: 'site', none: 'missing' }[source] as HaveState,
});

function schemaOf(entry: SeoPage): HaveCell {
  const own = entry.schemas.filter(({ source }) => source === 'page');
  if (own.length > 0) {
    const types = own.flatMap(({ schema }) => [schema['@type']].flat());
    return { state: 'own', detail: [...new Set(types)].join(', ') };
  }
  return { state: entry.schemas.length > 0 ? 'site' : 'missing' };
}

function translatedOf(entry: SeoPage, locales: readonly Locale[]): HaveCell {
  const cells = localeCells(entry.locales, locales);
  const where = (state: 'missing' | 'fallback') =>
    cells
      .filter((cell) => cell.state === state)
      .map(({ locale }) => locale)
      .join(' ');
  if (cells.some(({ state }) => state === 'missing')) {
    return { state: 'missing', detail: where('missing') };
  }
  if (cells.some(({ state }) => state === 'fallback')) {
    return { state: 'partial', detail: where('fallback') };
  }
  return { state: 'ok' };
}

/** La celda de cada columna para UNA entrada; la página junta las de sus idiomas con `worstCell`. */
export const HAVE_CELLS: Record<
  HaveColumn,
  (entry: SeoPage, locales: readonly Locale[]) => HaveCell
> = {
  [HaveColumn.DESCRIPTION]: (entry) => fromSource(entry.meta.descriptionSource),
  [HaveColumn.SCHEMA]: schemaOf,
  [HaveColumn.OG_IMAGE]: (entry) => fromSource(entry.meta.ogImageSource),
  // El análisis ya sabe si hay un solo H1 (también en las páginas externas): se reutiliza.
  [HaveColumn.H1]: (entry) => ({
    state: entry.issues.some(
      ({ kind }) => kind === IssueKind.NO_H1 || kind === IssueKind.MULTIPLE_H1,
    )
      ? 'missing'
      : 'ok',
  }),
  [HaveColumn.TRANSLATED]: translatedOf,
  [HaveColumn.INDEXABLE]: (entry) => ({ state: entry.meta.noindex ? 'no' : 'ok' }),
};

const worstCell = (cells: HaveCell[]): HaveCell =>
  cells.reduce((worst, cell) => (WEIGHT[cell.state] > WEIGHT[worst.state] ? cell : worst));

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

/**
 * Las filas de «Qué tiene»: una por página, con lo que tiene en cada columna. Una página en varios
 * idiomas junta los suyos y se queda con el peor (basta que un idioma no tenga lo propio para que
 * la página no lo tenga). Se conserva el orden de entrada.
 */
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
        good: rows.filter((row) => GOOD.includes(row.cells[column].state)).length,
        total: rows.length,
      },
    ]),
  ) as Record<HaveColumn, { good: number; total: number }>;
}

/** Si una celda cuenta como «lo tiene» (propio o cumple); lo heredado no. */
export const isGood = (cell: HaveCell): boolean => GOOD.includes(cell.state);

/** Las páginas a las que les falta lo propio de esa columna; sin columna, todas. */
export function lacking(rows: HaveRow[], column: HaveColumn | undefined): HaveRow[] {
  if (!column) return rows;
  return rows.filter((row) => !GOOD.includes(row.cells[column].state));
}
