import type { Locale } from '../i18n/locale';
import { pickLocalized } from '../i18n/translation-policy';
import { resolveLabel } from '../navigation/label';
import { slugInDir } from '../navigation/nav-sections';
import type { NavContext } from '../navigation/nav-sidebar';
import {
  navScopes,
  pageBlurb,
  scopeTrees,
  walkScope,
  type ScopeVisitor,
} from '../navigation/nav-walk';
import type { SidebarGroup } from '../navigation/sidebar';
import type { StoredCover } from './covers';

/* El listado de un índice generado: las páginas de una carpeta que están en la navegación, con la
   misma resolución que la barra lateral y `::nav-tree` (orden, URLs, insignias y políticas de
   traducción). Da dos vistas: las secciones con sus grupos (disposición lista) y la lista plana de
   entradas (tabla y tarjetas), que se ordena por fecha y se pagina. */

/** Lo que aporta cada página aparte del árbol: su fecha de commit y su portada. */
export interface EntryDetails {
  /** Fecha ISO de su último commit; sin ella (sin publicar), la entrada no lleva fecha. */
  updated?: string;
  cover?: StoredCover;
  imageAlt?: string;
}

/** Una página del listado. */
export interface ListingEntry {
  slug: string;
  title: string;
  href: string;
  /** Idioma del original cuando el enlace lleva a él (política `link`), como en la barra lateral. */
  badge?: Locale;
  summary?: string;
  updated?: string;
  /** Sección y grupos de los que cuelga, del más general al más concreto. */
  path: string[];
  cover?: StoredCover;
  imageAlt?: string;
}

/** Grupo de la navegación dentro de una sección del listado. */
export interface ListingGroup {
  label: string;
  href?: string;
  items: ListingNode[];
}

export type ListingNode = ListingEntry | ListingGroup;

export function isListingGroup(node: ListingNode): node is ListingGroup {
  return 'items' in node;
}

/** Sección de `nav` (o las páginas sin sección, sin etiqueta) con su árbol. */
export interface ListingSection {
  label?: string;
  /** Id del `h2` de la sección, único en la página. */
  id?: string;
  nodes: ListingNode[];
}

export interface Listing {
  sections: ListingSection[];
  /** Todas las entradas en el orden del árbol, sin repetir. */
  entries: ListingEntry[];
}

/** Id de un encabezado al estilo de github-slugger: minúsculas, letras y números de cualquier alfabeto, guiones. */
function headingId(text: string, taken: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-') || 'section';
  let id = base;
  for (let count = 1; taken.has(id); count++) id = `${base}-${count}`;
  taken.add(id);
  return id;
}

/** ¿Es `group` el de la propia carpeta (el que arma el árbol automático, o el que enlaza su página)? No aporta nada al camino. */
function isFolderGroup(group: SidebarGroup, folder: string): boolean {
  return group.dir === folder || group.slug === folder;
}

/** Lo que necesita `buildListing`. */
export interface ListingInput {
  context: NavContext;
  /** Idioma de los textos; las URLs son las de la barra lateral de `context.locale`. */
  contentLocale: Locale;
  folder: string;
  /** Fecha y portada de cada página, por identidad. */
  details: (slug: string) => EntryDetails | undefined;
  /** Ids que la página ya usa: los de las secciones no los repiten. */
  takenIds?: Iterable<string>;
}

/** Listado de la carpeta `folder`: textos en `contentLocale` y URLs como las de la barra lateral de `context.locale`. */
export function buildListing({
  context,
  contentLocale,
  folder,
  details,
  takenIds = [],
}: ListingInput): Listing {
  const { pages, config } = context;
  const seen = new Set<string>();
  const entries: ListingEntry[] = [];
  const ids = new Set(takenIds);

  const visitor: ScopeVisitor<ListingNode, string[]> = {
    page(node, target, path) {
      const { slug } = node;
      if (slug === undefined || seen.has(slug) || slug === folder || !slugInDir(folder, slug)) {
        return undefined;
      }
      seen.add(slug);
      const summary = pageBlurb(pickLocalized(pages, slug, contentLocale, config), contentLocale, {
        defaultLocale: config.defaultLocale,
        preferSummary: true,
      });
      const extra = details(slug);
      const entry: ListingEntry = {
        slug,
        title: node.label,
        href: target.href,
        ...(target.badge && { badge: target.badge }),
        ...(summary !== undefined && { summary }),
        path,
        ...(extra?.updated !== undefined && { updated: extra.updated }),
        ...(extra?.cover !== undefined && { cover: extra.cover }),
        ...(extra?.imageAlt !== undefined && { imageAlt: extra.imageAlt }),
      };
      entries.push(entry);
      return entry;
    },
    group(group, own, items) {
      if (isFolderGroup(group, folder)) return items;
      if (items.length === 0) return own ? [own] : [];
      return [{ label: group.label, ...(own && { href: own.href }), items }];
    },
    inside(group, path) {
      return isFolderGroup(group, folder) ? path : [...path, group.label];
    },
  };

  const sections: ListingSection[] = [];
  for (const scope of navScopes(config.nav)) {
    const item = scope.kind === 'section' ? config.nav?.[scope.position] : undefined;
    const label = item && resolveLabel(item.label, contentLocale, config.defaultLocale);
    const trees = scopeTrees(context, contentLocale, scope);
    const nodes = walkScope(trees, visitor, label === undefined ? [] : [label]);
    if (nodes.length === 0) continue;
    sections.push(label === undefined ? { nodes } : { label, id: headingId(label, ids), nodes });
  }
  return { sections, entries };
}

/** Lo más reciente primero; lo que no tiene commit (sin publicar, lo más nuevo) va delante, en el orden del árbol. No muta. */
export function sortByUpdated<T extends { updated?: string }>(entries: readonly T[]): T[] {
  return entries
    .map((entry, position) => ({ entry, position }))
    .sort((left, right) => {
      const older = left.entry.updated;
      const newer = right.entry.updated;
      if (older === undefined || newer === undefined) {
        if (older === newer) return left.position - right.position;
        return older === undefined ? -1 : 1;
      }
      const time = Date.parse(newer) - Date.parse(older);
      return time === 0 ? left.position - right.position : time;
    })
    .map(({ entry }) => entry);
}
