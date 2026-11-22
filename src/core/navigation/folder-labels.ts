import type { ResolvedConfig } from '../config/resolve';
import type { Label, SidebarItem } from '../config/schema';
import { isNavSection } from '../config/nav';
import type { Locale } from '../i18n/locale';
import { folderLabel } from '../shared/text';
import { resolveLabel } from './label';
import { toSidebarSlug } from './sidebar-slugs';

/* El nombre de una carpeta que no tiene `_index.md` ni `index.md` (el título de su índice generado):
   1. la sección de `nav` con `dir` en ella;
   2. la sección o el grupo declarado (`nav[n].sidebar`, `sidebar`) cuyas hojas tienen esa carpeta como
      carpeta común más profunda; si casan varios, el más interior;
   3. el nombre de la carpeta humanizado.
   La misma regla dice qué grupo declarado es el de una carpeta (`folderOfGroup`). */

/** Lo que hace falta de la config. */
export type FolderLabelConfig = Pick<ResolvedConfig, 'nav' | 'sidebar' | 'defaultLocale'>;

/** Los slugs de las hojas de unos items, a cualquier profundidad. */
function leafSlugs(items: readonly SidebarItem[]): string[] {
  return items.flatMap((item) =>
    typeof item === 'string' ? [toSidebarSlug(item)] : leafSlugs(item.items ?? []),
  );
}

/** La carpeta común más profunda de las hojas de un grupo; sin ninguna (o solo la raíz), `undefined`. */
export function folderOfGroup(items: readonly SidebarItem[]): string | undefined {
  const folders = leafSlugs(items).map((slug) => slug.split('/').slice(0, -1));
  const [first, ...rest] = folders;
  if (!first) return undefined;
  let length = first.length;
  for (const folder of rest) {
    let shared = 0;
    while (shared < Math.min(length, folder.length) && folder[shared] === first[shared]) shared++;
    length = shared;
  }
  return length > 0 ? first.slice(0, length).join('/') : undefined;
}

/** Un grupo declarado que casa con una carpeta: su etiqueta y lo hondo que está en lo declarado. */
interface Match {
  label: Label;
  depth: number;
}

/** Los grupos de `items` (y sus subgrupos) que casan con una carpeta, con su profundidad. */
function groupMatches(items: readonly SidebarItem[], depth: number, found: Map<string, Match>) {
  for (const item of items) {
    if (typeof item === 'string') continue;
    const children = item.items ?? [];
    keepInnermost(found, folderOfGroup(children), { label: item.label, depth });
    groupMatches(children, depth + 1, found);
  }
}

/** Guarda `match` para `folder` si no hay otro más interior (a igual profundidad, el primero). */
function keepInnermost(found: Map<string, Match>, folder: string | undefined, match: Match) {
  if (folder === undefined) return;
  const current = found.get(folder);
  if (!current || match.depth > current.depth) found.set(folder, match);
}

/** Título de cada carpeta que tiene uno declarado (pasos 1 y 2), en `locale`. */
export function folderLabels(config: FolderLabelConfig, locale: Locale): Map<string, string> {
  const found = new Map<string, Match>();
  for (const item of config.nav ?? []) {
    if (!isNavSection(item)) continue;
    // La sección es el grupo más exterior; la que tiene `dir` lo nombra siempre (paso 1).
    keepInnermost(found, folderOfGroup(item.sidebar ?? []), { label: item.label, depth: 0 });
    groupMatches(item.sidebar ?? [], 1, found);
  }
  groupMatches(config.sidebar ?? [], 1, found);
  for (const item of config.nav ?? []) {
    if (isNavSection(item) && item.dir !== undefined) {
      found.set(item.dir, { label: item.label, depth: Infinity });
    }
  }
  return new Map(
    [...found].map(([folder, { label }]) => [
      folder,
      resolveLabel(label, locale, config.defaultLocale),
    ]),
  );
}

/** Título de una carpeta en un idioma, con el nombre humanizado si nadie declara uno (paso 3). */
export function folderTitles(
  config: FolderLabelConfig,
): (folder: string, locale: Locale) => string {
  const byLocale = new Map<Locale, Map<string, string>>();
  return (folder, locale) => {
    let labels = byLocale.get(locale);
    if (!labels) {
      labels = folderLabels(config, locale);
      byLocale.set(locale, labels);
    }
    return labels.get(folder) ?? folderLabel(folder);
  };
}
