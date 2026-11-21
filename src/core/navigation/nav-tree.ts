import { isNavSection, type NavItem } from '../config/nav';
import type { Locale } from '../i18n/locale';
import { sourceLocale } from '../i18n/translation-policy';
import { resolveLabel } from './label';
import type { NavContext } from './nav-entries';
import { buildSectionSidebar } from './nav-sidebar';
import { flatten, isSidebarGroup, type SidebarNode } from './sidebar';

/* El índice generado por la directiva `::nav-tree`: el árbol de cada sección de `nav`, el mismo que
   pinta la barra lateral, con la descripción de cada página. El plugin de Markdown deja un hueco
   por sección (`NAV_TREE_ATTRIBUTE`) y la ruta lo rellena con el árbol del idioma que se pinta. */

/** Página del índice: título, URL y, si su `seo` la trae, descripción. */
export interface NavTreeLeaf {
  label: string;
  href: string;
  /** Idioma del original cuando el enlace lleva a él (política `link`), como en la barra lateral. */
  badge?: Locale;
  description?: string;
}

/** Grupo del `sidebar`: su página propia, si la tiene, y lo que cuelga de él. */
export interface NavTreeGroup {
  label: string;
  href?: string;
  badge?: Locale;
  description?: string;
  items: NavTreeNode[];
}

export type NavTreeNode = NavTreeLeaf | NavTreeGroup;

export function isNavTreeGroup(node: NavTreeNode): node is NavTreeGroup {
  return 'items' in node;
}

/** Atributo del hueco que deja la directiva: su valor es la posición de la sección en `nav`. */
export const NAV_TREE_ATTRIBUTE = 'data-docs-nav-tree';
/** Atributo del hueco que dice si el árbol lleva las descripciones (`true`/`false`). */
export const NAV_TREE_DESCRIPTIONS_ATTRIBUTE = 'data-docs-nav-tree-descriptions';

/** Todos los nombres de una sección: su etiqueta en cada idioma y su carpeta. */
function namesOf(item: NavItem): string[] {
  if (!isNavSection(item)) return [];
  const labels = typeof item.label === 'string' ? [item.label] : Object.values(item.label);
  return [...labels, ...(item.dir === undefined ? [] : [item.dir])];
}

/** Posición en `nav` de la sección que nombra `name` (su etiqueta en cualquier idioma o su `dir`); `-1` si no hay ninguna. */
export function findNavSection(nav: readonly NavItem[] | undefined, name: string): number {
  return (nav ?? []).findIndex((item) => namesOf(item).includes(name));
}

/** Etiquetas de las secciones en un idioma, para decir en un error cuáles hay. */
export function navSectionNames(
  nav: readonly NavItem[] | undefined,
  locale: Locale,
  defaultLocale: Locale,
): string[] {
  return (nav ?? [])
    .filter(isNavSection)
    .map((item) => resolveLabel(item.label, locale, defaultLocale));
}

/** Descripción de la página `slug` en el idioma del contenido; sin esa traducción, la del original. */
function descriptionOf(context: NavContext, slug: string, locale: Locale): string | undefined {
  const { pages, availability, config } = context;
  const own = pages.find((page) => page.slug === slug && page.locale === locale);
  const source = sourceLocale(availability.get(slug) ?? {}, config.locales, config.defaultLocale);
  const page = own ?? pages.find((item) => item.slug === slug && item.locale === source);
  const description = page?.seo?.description;
  if (description === undefined) return undefined;
  return resolveLabel(description, locale, config.defaultLocale) || undefined;
}

/** Destino de cada página en el árbol de la ruta: lo que no está ahí, la política lo omite. */
type Targets = Map<string, { href: string; badge?: Locale }>;

function targetsOf(tree: SidebarNode[]): Targets {
  return new Map(
    flatten(tree).map((leaf) => [
      leaf.slug,
      { href: leaf.href, ...(leaf.badge && { badge: leaf.badge }) },
    ]),
  );
}

function toNavTree(
  nodes: SidebarNode[],
  targets: Targets,
  describe: (slug: string) => string | undefined,
): NavTreeNode[] {
  return nodes.flatMap((node): NavTreeNode[] => {
    const target = node.slug === undefined ? undefined : targets.get(node.slug);
    const own = target && {
      href: target.href,
      ...(target.badge && { badge: target.badge }),
      ...withDescription(describe(node.slug!)),
    };
    if (!isSidebarGroup(node)) return own ? [{ label: node.label, ...own }] : [];
    const items = toNavTree(node.items, targets, describe);
    if (items.length === 0 && !own) return [];
    return [{ label: node.label, ...own, items }];
  });
}

function withDescription(description: string | undefined) {
  return description === undefined ? {} : { description };
}

/** Árbol de la sección `index` de `nav`, con la resolución de la barra lateral. Los textos (etiquetas, títulos y descripciones) van en `contentLocale`, el idioma del contenido; las URLs, las insignias y lo que se omite son los de la barra lateral de `context.locale`, el idioma de la ruta. Solo difieren en una ruta de reserva. */
export function buildNavTree(
  context: NavContext,
  contentLocale: Locale,
  index: number,
): NavTreeNode[] {
  const item = context.config.nav?.[index];
  if (!item || !isNavSection(item)) return [];
  const route = buildSectionSidebar(context, index);
  const content =
    contentLocale === context.locale
      ? route
      : buildSectionSidebar({ ...context, locale: contentLocale }, index);
  return toNavTree(content, targetsOf(route), (slug) =>
    descriptionOf(context, slug, contentLocale),
  );
}

/** El árbol de cada posición de `nav` (vacío en lo que no es una sección). */
export function buildNavTrees(context: NavContext, contentLocale: Locale): NavTreeNode[][] {
  return (context.config.nav ?? []).map((_item, index) =>
    buildNavTree(context, contentLocale, index),
  );
}

/** Trozo del HTML de una página: HTML tal cual o el hueco de un árbol. */
export type NavTreeSegment =
  { kind: 'html'; html: string } | { kind: 'tree'; section: number; descriptions: boolean };

const SLOT = new RegExp(
  `<div ${NAV_TREE_ATTRIBUTE}="(\\d+)" ${NAV_TREE_DESCRIPTIONS_ATTRIBUTE}="(true|false)"></div>`,
  'g',
);

/** Parte el HTML renderizado en los huecos de `::nav-tree`, para pintar cada árbol en su sitio. */
export function splitNavTrees(html: string): NavTreeSegment[] {
  const segments: NavTreeSegment[] = [];
  let last = 0;
  for (const match of html.matchAll(SLOT)) {
    if (match.index > last) segments.push({ kind: 'html', html: html.slice(last, match.index) });
    segments.push({
      kind: 'tree',
      section: Number(match[1]),
      descriptions: match[2] === 'true',
    });
    last = match.index + match[0].length;
  }
  if (last < html.length || segments.length === 0) {
    segments.push({ kind: 'html', html: html.slice(last) });
  }
  return segments;
}
