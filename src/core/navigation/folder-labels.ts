import type { ConfigPick } from '../config/resolve';
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
export type FolderLabelConfig = ConfigPick<never, 'defaultLocale', 'nav' | 'sidebar'>;

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
  for (const item of config.content.nav ?? []) {
    if (!isNavSection(item)) continue;
    const folder = folderOfGroup(item.sidebar ?? []);
    if (folder !== undefined) {
      found.push({ owner: item, label: item.label, folder, wrappers: [], group: false });
    }
    found.push(...groupCandidates(item.sidebar ?? [], [item]));
  }
  return [...found, ...groupCandidates(config.content.sidebar ?? [], [])];
}

/* «Si casan varios, el más interior»: el dueño de una carpeta es el candidato al que envuelven todos
   los demás. Si hay candidatos que no se envuelven entre sí (un sitio plano, con todas las páginas en
   la misma carpeta y el árbol hecho con `sidebar`), «el más interior» no existe y la carpeta se queda
   sin dueño. */
function innermost(all: readonly Candidate[]): Map<string, Candidate> {
  const byFolder = new Map<string, Candidate[]>();
  for (const candidate of all) {
    byFolder.set(candidate.folder, [...(byFolder.get(candidate.folder) ?? []), candidate]);
  }
  const found = new Map<string, Candidate>();
  for (const [folder, matches] of byFolder) {
    const owner = matches.find((candidate) =>
      matches.every((other) => other === candidate || candidate.wrappers.includes(other.owner)),
    );
    if (owner) found.set(folder, owner);
  }
  return found;
}

/** Carpeta padre (`a/b/c` → `a/b`; la de un solo segmento no tiene: `''`). */
function parentFolder(folder: string): string {
  return folder.split('/').slice(0, -1).join('/');
}

/* Toda categoría con página índice es un enlace, también la que solo envuelve a otra («Cloud» › «AWS»):
   si la carpeta de un grupo es de uno de sus descendientes, el grupo sube a la carpeta de encima (y
   sigue subiendo mientras esa también sea de un descendiente) y la toma si nadie es su dueño; si la
   reclaman varios grupos que suben, gana el más interior con la misma regla. */
function owners(config: FolderLabelConfig): Map<string, Candidate> {
  const primary = candidates(config);
  const first = innermost(primary);
  const lifted = primary.flatMap((candidate) => {
    let folder = candidate.folder;
    for (
      let owner = first.get(folder);
      owner && owner !== candidate && owner.wrappers.includes(candidate.owner);
      owner = first.get(folder)
    ) {
      folder = parentFolder(folder);
    }
    // Solo una carpeta sin dueño: subir no le quita la suya a quien lo envuelve ni a otro grupo.
    return folder === candidate.folder || folder === '' || first.has(folder)
      ? []
      : [{ ...candidate, folder }];
  });
  return innermost([...primary, ...lifted]);
}

/** Título de cada carpeta que tiene uno declarado (pasos 1 y 2), en `locale`. */
export function folderLabels(config: FolderLabelConfig, locale: Locale): Map<string, string> {
  const labels = new Map<string, Label>(
    [...owners(config)].map(([folder, candidate]) => [folder, candidate.label]),
  );
  // Paso 1: la sección con `dir` nombra su carpeta siempre.
  for (const item of config.content.nav ?? []) {
    if (isNavSection(item) && item.dir !== undefined) labels.set(item.dir, item.label);
  }
  return new Map(
    [...labels].map(([folder, label]) => [
      folder,
      resolveLabel(label, locale, config.i18n.defaultLocale),
    ]),
  );
}

/** La carpeta de cada sección de `nav`: su `dir` o, sin él, la carpeta de la que es dueña (la de sus páginas). En `tree.show: 'all'` el grupo de la sección enlaza la página de esa carpeta. */
export function sectionFolders(config: FolderLabelConfig): Map<object, string> {
  const found = new Map<object, string>(
    [...owners(config)]
      .filter(([, candidate]) => !candidate.group)
      .map(([folder, candidate]) => [candidate.owner, folder]),
  );
  for (const item of config.content.nav ?? []) {
    if (isNavSection(item) && item.dir !== undefined) found.set(item, item.dir);
  }
  return found;
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
