import { isNavSection, type NavItem } from '../config/nav';
import type { Locale } from '../i18n/locale';
import { pickLocalized } from '../i18n/translation-policy';
import { resolveLabel } from './label';
import type { NavContext } from './nav-sidebar';
import { pageBlurb, scopeTrees, walkScope } from './nav-walk';

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

/** Árbol de la sección `index` de `nav`, con la resolución de la barra lateral. Los textos (etiquetas, títulos y descripciones) van en `contentLocale`, el idioma del contenido; las URLs, las insignias y lo que se omite son los de la barra lateral de `context.locale`, el idioma de la ruta. Solo difieren en una ruta de reserva. */
export function buildNavTree(
  context: NavContext,
  contentLocale: Locale,
  index: number,
): NavTreeNode[] {
  const item = context.config.nav?.[index];
  if (!item || !isNavSection(item)) return [];
  const { pages, config } = context;
  const trees = scopeTrees(context, contentLocale, { kind: 'section', position: index });
  return walkScope<NavTreeNode, undefined>(
    trees,
    {
      page(node, target) {
        const description = pageBlurb(
          pickLocalized(pages, node.slug!, contentLocale, config),
          contentLocale,
          { defaultLocale: config.defaultLocale },
        );
        return {
          label: node.label,
          href: target.href,
          ...(target.badge && { badge: target.badge }),
          ...(description !== undefined && { description }),
        };
      },
      group(group, own, items) {
        if (items.length === 0 && !own) return [];
        return [{ ...own, label: group.label, items }];
      },
    },
    undefined,
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

/** ¿Deja el HTML renderizado algún hueco de `::nav-tree`? Mira el HTML y no el Markdown: un `::nav-tree` dentro de un bloque de código no deja hueco. */
export function hasNavTreeSlots(html: string): boolean {
  return splitNavTrees(html).some((segment) => segment.kind === 'tree');
}

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
