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

/** Un grupo declarado (o una sección) que casa con una carpeta, con los que lo envuelven. */
interface Candidate {
  /** El objeto declarado: un grupo de un `sidebar` o una sección de `nav`. */
  owner: object;
  label: Label;
  folder: string;
  /** Las secciones y los grupos que lo envuelven, del más exterior al más cercano. */
  wrappers: readonly object[];
  /** Es un grupo de un `sidebar` (no una sección): el único que puede enlazar su carpeta. */
  group: boolean;
}

/** Los grupos de `items` (y sus subgrupos) que casan con alguna carpeta. */
function groupCandidates(items: readonly SidebarItem[], wrappers: readonly object[]): Candidate[] {
  return items.flatMap((item) => {
    if (typeof item === 'string') return [];
    const children = item.items ?? [];
    const folder = folderOfGroup(children);
    const own: Candidate[] =
      folder === undefined
        ? []
        : [{ owner: item, label: item.label, folder, wrappers, group: true }];
    return [...own, ...groupCandidates(children, [...wrappers, item])];
  });
}

/** Todo lo declarado que casa con alguna carpeta: las secciones de `nav`, sus grupos y los de `sidebar`. */
function candidates(config: FolderLabelConfig): Candidate[] {
  const found: Candidate[] = [];
  for (const item of config.nav ?? []) {
    if (!isNavSection(item)) continue;
    const folder = folderOfGroup(item.sidebar ?? []);
    if (folder !== undefined) {
      found.push({ owner: item, label: item.label, folder, wrappers: [], group: false });
    }
    found.push(...groupCandidates(item.sidebar ?? [], [item]));
  }
  return [...found, ...groupCandidates(config.sidebar ?? [], [])];
}

/* «Si casan varios, el más interior»: el dueño de una carpeta es el candidato al que envuelven todos
   los demás (el grupo «Cloud» que solo envuelve a «AWS» se lo cede). Si hay candidatos que no se
   envuelven entre sí (un sitio plano, con todas las páginas en la misma carpeta y el árbol hecho con
   `sidebar`), «el más interior» no existe y la carpeta se queda sin dueño. */
function owners(config: FolderLabelConfig): Map<string, Candidate> {
  const byFolder = new Map<string, Candidate[]>();
  for (const candidate of candidates(config)) {
    byFolder.set(candidate.folder, [...(byFolder.get(candidate.folder) ?? []), candidate]);
  }
  const found = new Map<string, Candidate>();
  for (const [folder, matches] of byFolder) {
    const innermost = matches.find((candidate) =>
      matches.every((other) => other === candidate || candidate.wrappers.includes(other.owner)),
    );
    if (innermost) found.set(folder, innermost);
  }
  return found;
}

/** Título de cada carpeta que tiene uno declarado (pasos 1 y 2), en `locale`. */
export function folderLabels(config: FolderLabelConfig, locale: Locale): Map<string, string> {
  const labels = new Map<string, Label>(
    [...owners(config)].map(([folder, candidate]) => [folder, candidate.label]),
  );
  // Paso 1: la sección con `dir` nombra su carpeta siempre.
  for (const item of config.nav ?? []) {
    if (isNavSection(item) && item.dir !== undefined) labels.set(item.dir, item.label);
  }
  return new Map(
    [...labels].map(([folder, label]) => [
      folder,
      resolveLabel(label, locale, config.defaultLocale),
    ]),
  );
}

/** La carpeta de cada grupo declarado que es su dueño (la misma regla que los títulos): su etiqueta enlaza la página de esa carpeta. Las secciones no cuentan: en su barra, la etiqueta es la cabecera. */
export function groupFolders(config: FolderLabelConfig): Map<object, string> {
  return new Map(
    [...owners(config)]
      .filter(([, candidate]) => candidate.group)
      .map(([folder, candidate]) => [candidate.owner, folder]),
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
