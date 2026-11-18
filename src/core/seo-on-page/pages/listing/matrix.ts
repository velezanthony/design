import type { Locale } from '../../../i18n/locale';
import type { SeoLocaleEntry, SeoPage } from '../../tree/types';
import { tagsOf, type PageTag } from './rows';

/**
 * Cómo está la página en un idioma: existe, falta (no hay fichero y la política enlaza al original),
 * se sirve de respaldo (otro idioma bajo su ruta) u omitida a propósito (política `omit`).
 */
export type MatrixState = 'exists' | 'missing' | 'fallback' | 'omitted';

/** `reciprocal`: cada versión enlaza a las demás; `unpaired`: solo hay una; `omitted`: noindex. */
export type HreflangState = 'reciprocal' | 'unpaired' | 'omitted';

export interface MatrixRow {
  slug: string;
  title: string;
  href: string;
  tags: PageTag[];
  /** Una por idioma configurado, en el orden de la config. */
  cells: { locale: Locale; state: MatrixState }[];
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

/** Cómo está la página en cada idioma configurado, en el orden de la config. Lo lee de `entry.locales`. */
export function localeCells(
  group: readonly SeoLocaleEntry[],
  locales: readonly Locale[],
): MatrixRow['cells'] {
  return locales.map((locale) => {
    const found = group.find((entry) => entry.locale === locale);
    if (found?.status === 'present') return { locale, state: 'exists' as const };
    if (found?.status !== 'missing') return { locale, state: 'missing' as const };
    const state = { link: 'missing', fallback: 'fallback', omit: 'omitted' } as const;
    return { locale, state: state[found.policy] };
  });
}

function rowOf(slug: string, entries: SeoPage[], input: MatrixInput): MatrixRow {
  const { locales, defaultLocale, inspector } = input;
  const byLocale = new Map(entries.map((entry) => [entry.locale, entry]));
  const main = byLocale.get(defaultLocale) ?? locales.map((l) => byLocale.get(l)).find(Boolean);
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

/**
 * La matriz de idiomas: una fila por página y una columna por idioma configurado, con el hreflang
 * que el `<head>` emite (mismas reglas que `buildHead`: solo con varias versiones indexables, y
 * `x-default` hacia el idioma por defecto si existe). Las incompletas van primero, que es lo que
 * se viene a buscar; el resto conserva su orden.
 */
export function matrixRows(entries: readonly SeoPage[], input: MatrixInput): Matrix {
  const bySlug = new Map<string, SeoPage[]>();
  for (const entry of entries) bySlug.set(entry.slug, [...(bySlug.get(entry.slug) ?? []), entry]);
  const rows = [...bySlug]
    .map(([slug, group]) => rowOf(slug, group, input))
    .sort((a, b) => Number(a.complete) - Number(b.complete));
  return {
    rows,
    hreflang: input.locales.length > 1,
    complete: rows.filter(({ complete }) => complete).length,
  };
}
