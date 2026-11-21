import type { IndexLayout } from '../config/indexes';
import type { Locale } from '../i18n/locale';
import { pickLocalized } from '../i18n/translation-policy';
import { resolveLabel } from './label';
import { slugInDir } from './nav-sections';
import type { NavContext } from './nav-sidebar';
import { navScopes, pageBlurb, scopeTrees, walkScope, type ScopeVisitor } from './nav-walk';
import type { SidebarGroup } from './sidebar';

/* El listado de un índice generado: las páginas de una carpeta que están en la navegación, con la
   misma resolución que la barra lateral y `::nav-tree` (orden, URLs, insignias y políticas de
   traducción). Da dos vistas: las secciones con sus grupos (disposición lista) y la lista plana de
   entradas (tabla y tarjetas), que se ordena por fecha y se pagina. */

/** Nombres de la query del selector «Por página»: `?por=18&pagina=2`. */
export const PER_PAGE_PARAM = 'por';
export const PAGE_PARAM = 'pagina';

/** Portada guardada de una página: `false` (sin imagen), `'missing'` (la ruta no existe: va la de la librería), una imagen procesada (`asset`) o una de `public/` (`src`). */
export type StoredCover = false | 'missing' | { asset: unknown } | { src: string };

/** Lo que aporta cada página aparte del árbol: su fecha de commit y su portada. */
export interface EntryDetails {
  /** Fecha ISO de su último commit; sin ella (sin publicar), la entrada no lleva fecha. */
  updated?: string;
  cover?: StoredCover;
  imageAlt?: string;
}

/** Una página del listado. */
export interface IndexEntry {
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
export interface IndexGroup {
  label: string;
  href?: string;
  items: IndexNode[];
}

export type IndexNode = IndexEntry | IndexGroup;

export function isIndexGroup(node: IndexNode): node is IndexGroup {
  return 'items' in node;
}

/** Sección de `nav` (o las páginas sin sección, sin etiqueta) con su árbol. */
export interface IndexSection {
  label?: string;
  /** Id del `h2` de la sección, único en la página. */
  id?: string;
  nodes: IndexNode[];
}

export interface IndexListing {
  sections: IndexSection[];
  /** Todas las entradas en el orden del árbol, sin repetir. */
  entries: IndexEntry[];
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

/** Listado de la carpeta `folder`: textos en `contentLocale` y URLs como las de la barra lateral de `context.locale`. `takenIds` son los ids que la página ya usa. */
export function buildIndexListing(
  context: NavContext,
  contentLocale: Locale,
  folder: string,
  details: (slug: string) => EntryDetails | undefined,
  takenIds: Iterable<string> = [],
): IndexListing {
  const { pages, config } = context;
  const seen = new Set<string>();
  const entries: IndexEntry[] = [];
  const ids = new Set(takenIds);

  const visitor: ScopeVisitor<IndexNode, string[]> = {
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
      const entry: IndexEntry = {
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

  const sections: IndexSection[] = [];
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

/** Lo que se pinta como portada de una entrada. */
export type EntryCover =
  | { kind: 'none' }
  | { kind: 'placeholder' }
  | { kind: 'image'; source: { asset: unknown } | { src: string }; alt: string };

/** Portada de una entrada: lo de la página manda (imagen, `false` o una ruta que falta → la de la librería); sin nada, la política del listado (`true`: la de la librería). Sin `imageAlt`, decorativa. */
export function coverFor(
  stored: StoredCover | undefined,
  policy: boolean,
  imageAlt?: string,
): EntryCover {
  if (stored === false) return { kind: 'none' };
  if (stored === 'missing') return { kind: 'placeholder' };
  if (stored !== undefined) return { kind: 'image', source: stored, alt: imageAlt ?? '' };
  return policy ? { kind: 'placeholder' } : { kind: 'none' };
}

/** Dibujo de la portada de la librería. */
export type CoverPattern = 'grid' | 'diagonal' | 'dots';

const PATTERNS: readonly CoverPattern[] = ['grid', 'diagonal', 'dots'];

/** El dibujo de una página: estable (sale de su slug), así no cambia al moverse de página. */
export function coverPattern(slug: string): CoverPattern {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PATTERNS[hash % PATTERNS.length]!;
}

/** Fecha de una entrada: formato medio del idioma, en UTC (la de un commit no depende de quién construye). */
export function formatIndexDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(iso))
    .replace(/\./g, '');
}

/** Una entrada lista para pintar: su portada ya decidida. */
export interface IndexItem<C = EntryCover> extends Omit<IndexEntry, 'cover' | 'imageAlt'> {
  cover: C;
}

/** Las páginas de un tamaño del selector y sus URLs (la posición 0 es la página 1). */
export interface IndexSize {
  perPage: number;
  pages: number;
  hrefs: string[];
}

/** Todo lo que pinta el índice de una página. */
export interface IndexView<C = EntryCover> {
  layout: IndexLayout;
  /** Disposición lista: las secciones con sus grupos (vacío en las demás). */
  sections: IndexSection[];
  /** Tabla y tarjetas: las entradas, de la más reciente a la más antigua. En la página 1, todas (`all`); en las demás, solo las suyas. */
  items: IndexItem<C>[];
  /** `items` trae todas las entradas: sin JavaScript se ven las `perPage` primeras y el selector cambia cuántas. */
  all: boolean;
  /** Entradas por página de las rutas estáticas. */
  perPage: number;
  /** Opciones del selector «Por página» (vacío en la lista o con una sola opción útil). */
  perPageOptions: number[];
  /** Solo en la página 1: por cada opción, sus páginas y la URL de cada una (las del tamaño de la config son las estáticas). */
  sizes: IndexSize[];
  page: number;
  pages: number;
  /** Entradas de todo el listado. */
  total: number;
  /** URL de cada página del listado; la posición 0 es la página 1. */
  hrefs: string[];
  /** Encabezados que añade el listado (las secciones de la lista), para el índice de la página. */
  headings: { depth: number; slug: string; text: string }[];
  /** Desde la página 2: el título de la página y «Página n de m», en lugar del cuerpo. */
  heading?: { title: string; page: string };
}

/** Portada como la pinta el componente: la imagen ya es una URL. */
export type CoverView =
  { kind: 'none' } | { kind: 'placeholder' } | { kind: 'image'; src: string; alt: string };
