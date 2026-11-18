import type { Locale } from '../../../i18n/locale';
import type { SeoPage } from '../../tree/types';
import { localeCells, type LocaleCell } from '../../tree/locale-cells';
import { tagsOf, type PageTag } from './rows';
import { groupBySlug, mainEntry } from './group';

/** `reciprocal`: cada versión enlaza a las demás; `unpaired`: solo hay una; `omitted`: noindex. */
export type HreflangState = 'reciprocal' | 'unpaired' | 'omitted';

export interface MatrixRow {
  slug: string;
  title: string;
  href: string;
  tags: PageTag[];
  /** Una por idioma configurado, en el orden de la config. */
  cells: LocaleCell[];
  hreflang: HreflangState;
  /** El idioma al que apunta `x-default`; `undefined` si la página no lo emite. */
  xDefault: Locale | undefined;
  /** Todos los idiomas existen. */
  complete: boolean;
}

export interface Matrix {
  rows: MatrixRow[];
  /** Con un solo idioma configurado el `<head>` no emite hreflang: las columnas sobran. */
  hreflang: boolean;
  /** Páginas con todos sus idiomas. */
  complete: number;
}

interface MatrixInput {
  locales: readonly Locale[];
  defaultLocale: Locale;
  inspector: (target: { slug: string; locale: Locale }) => string;
}

function rowOf(slug: string, entries: SeoPage[], input: MatrixInput): MatrixRow {
  const { locales, defaultLocale, inspector } = input;
  const main = mainEntry(entries, locales, defaultLocale);
  // El estado de cada idioma es del grupo, no de una entrada: cualquiera de ellas lo sabe.
  const cells = localeCells(main?.locales ?? [], locales);
  const existing = cells.filter(({ state }) => state === 'exists');
  const noindex = entries.some((entry) => entry.meta.noindex);
  const hreflang = noindex ? 'omitted' : existing.length > 1 ? 'reciprocal' : 'unpaired';
  const hasDefault = existing.some(({ locale }) => locale === defaultLocale);
  return {
    slug,
    title: main?.meta.title ?? '',
    href: inspector({ slug, locale: main?.locale ?? defaultLocale }),
    tags: tagsOf(entries, locales),
    cells,
    hreflang,
    xDefault: hreflang === 'reciprocal' && hasDefault ? defaultLocale : undefined,
    complete: existing.length === locales.length,
  };
}

/** Hreflang con las reglas de `buildHead`; las páginas incompletas van primero. */
export function matrixRows(entries: readonly SeoPage[], input: MatrixInput): Matrix {
  const bySlug = groupBySlug(entries);
  const rows = [...bySlug]
    .map(([slug, group]) => rowOf(slug, group, input))
    .sort((left, right) => Number(left.complete) - Number(right.complete));
  return {
    rows,
    hreflang: input.locales.length > 1,
    complete: rows.filter(({ complete }) => complete).length,
  };
}
