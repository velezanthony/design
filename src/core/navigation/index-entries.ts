import type { IndexLayout } from '../config/indexes';
import { isNavSection } from '../config/nav';
import type { Locale } from '../i18n/locale';
import { sourceLocale } from '../i18n/translation-policy';
import { resolveLabel } from './label';
import type { NavContext } from './nav-entries';
import { slugInDir } from './nav-sections';
import { buildSectionSidebar } from './nav-sidebar';
import { flatten, humanize, isSidebarGroup, type SidebarNode } from './sidebar';

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

/** La página `slug` en el idioma del contenido o, sin esa traducción, la del original. */
function contentPage(context: NavContext, slug: string, locale: Locale) {
  const { pages, availability, config } = context;
  const own = pages.find((page) => page.slug === slug && page.locale === locale);
  if (own) return own;
  const source = sourceLocale(availability.get(slug) ?? {}, config.locales, config.defaultLocale);
  return pages.find((page) => page.slug === slug && page.locale === source);
}

function summaryOf(context: NavContext, slug: string, locale: Locale): string | undefined {
  const page = contentPage(context, slug, locale);
  if (page?.index?.summary) return page.index.summary;
  const description = page?.seo?.description;
  if (description === undefined) return undefined;
  return resolveLabel(description, locale, context.config.defaultLocale) || undefined;
}

/** ¿Es `group` el de la propia carpeta (el que arma el árbol automático)? No aporta nada al camino. */
function isFolderGroup(group: SidebarNode & { items: SidebarNode[] }, folder: string): boolean {
  if (group.slug !== undefined) return group.slug === folder;
  const leaves = flatten(group.items);
  return (
    leaves.length > 0 &&
    leaves.every((leaf) => slugInDir(folder, leaf.slug)) &&
    group.label === humanize(folder.split('/').pop() ?? folder)
  );
}

type Targets = Map<string, { href: string; badge?: Locale }>;

/** Árboles de la ruta (URLs) y del contenido (textos) de la sección `index` (`-1`: sin sección). */
function sectionTrees(context: NavContext, contentLocale: Locale, index: number) {
  const route = buildSectionSidebar(context, index);
  const content =
    contentLocale === context.locale
      ? route
      : buildSectionSidebar({ ...context, locale: contentLocale }, index);
  const targets: Targets = new Map(
    flatten(route).map((leaf) => [
      leaf.slug,
      { href: leaf.href, ...(leaf.badge && { badge: leaf.badge }) },
    ]),
  );
  return { content, targets };
}

/** Listado de la carpeta `folder`: textos en `contentLocale` y URLs como las de la barra lateral de `context.locale`. `takenIds` son los ids que la página ya usa. */
export function buildIndexListing(
  context: NavContext,
  contentLocale: Locale,
  folder: string,
  details: (slug: string) => EntryDetails | undefined,
  takenIds: Iterable<string> = [],
): IndexListing {
  const { nav } = context.config;
  const seen = new Set<string>();
  const entries: IndexEntry[] = [];
  const ids = new Set(takenIds);

  function entryOf(slug: string, label: string, path: string[], targets: Targets) {
    const target = targets.get(slug);
    if (!target || seen.has(slug) || slug === folder || !slugInDir(folder, slug)) return undefined;
    seen.add(slug);
    const summary = summaryOf(context, slug, contentLocale);
    const extra = details(slug);
    const entry: IndexEntry = {
      slug,
      title: label,
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
  }

  function walk(nodes: SidebarNode[], path: string[], targets: Targets): IndexNode[] {
    return nodes.flatMap((node): IndexNode[] => {
      if (!isSidebarGroup(node)) {
        const entry = entryOf(node.slug, node.label, path, targets);
        return entry ? [entry] : [];
      }
      if (isFolderGroup(node, folder)) return walk(node.items, path, targets);
      const inner = [...path, node.label];
      const own =
        node.slug === undefined ? undefined : entryOf(node.slug, node.label, path, targets);
      const items = walk(node.items, inner, targets);
      if (items.length === 0 && !own) return [];
      if (items.length === 0 && own) return [own];
      return [{ label: node.label, ...(own && { href: own.href }), items }];
    });
  }

  const sections: IndexSection[] = [];
  const indexes = (nav ?? []).flatMap((item, index) => (isNavSection(item) ? [index] : []));
  for (const index of [...indexes, -1]) {
    const { content, targets } = sectionTrees(context, contentLocale, index);
    const item = index === -1 ? undefined : nav?.[index];
    const label = item && resolveLabel(item.label, contentLocale, context.config.defaultLocale);
    const nodes = walk(content, label === undefined ? [] : [label], targets);
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
