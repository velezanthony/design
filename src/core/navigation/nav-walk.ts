import { isNavSection, type NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import type { Locale } from '../i18n/locale';
import { resolveLabel } from './label';
import { buildSectionSidebar, type NavContext, type NavScope } from './nav-sidebar';
import {
  flatten,
  isSidebarGroup,
  type SidebarGroup,
  type SidebarLeaf,
  type SidebarNode,
} from './sidebar';

/* El único recorrido de la navegación que comparten `::nav-tree` y los listados generados: por cada
   ámbito (una sección de `nav` o las páginas sin sección), el árbol del contenido da los textos y el
   de la ruta da las URLs, las insignias y lo que la política omite. Cada consumidor es un visitante
   que decide qué nodo produce. */

/** Ámbitos de `nav` en orden: cada sección por su posición y, al final, las páginas sin sección. */
export function navScopes(nav: readonly NavItem[] | undefined): NavScope[] {
  const sections = (nav ?? []).flatMap((item, position): NavScope[] =>
    isNavSection(item) ? [{ kind: 'section', position }] : [],
  );
  return [...sections, { kind: 'unsectioned' }];
}

/** Destino de una página en el árbol de la ruta. */
export interface NavTarget {
  href: string;
  /** Idioma del original cuando el enlace lleva a él (política `link`). */
  badge?: Locale;
}

/** Los dos árboles de un ámbito: el del contenido (textos) y los destinos del de la ruta (URLs). */
export interface ScopeTrees {
  content: SidebarNode[];
  /** Por identidad; lo que no está aquí, la política lo omite en el idioma de la ruta. */
  targets: ReadonlyMap<string, NavTarget>;
}

/** Árboles de `scope`: los textos en `contentLocale` y las URLs como las de la barra lateral de `context.locale`. Solo difieren en una ruta de reserva. `base`: la raíz si el ámbito no tiene `dir` (ver `buildSectionSidebar`). */
export function scopeTrees(
  context: NavContext,
  contentLocale: Locale,
  scope: NavScope,
  base?: string,
): ScopeTrees {
  const route = buildSectionSidebar(context, scope, base);
  const content =
    contentLocale === context.locale
      ? route
      : buildSectionSidebar({ ...context, locale: contentLocale }, scope, base);
  const targets = new Map(
    flatten(route).map((leaf): [string, NavTarget] => [
      leaf.slug,
      { href: leaf.href, ...(leaf.badge && { badge: leaf.badge }) },
    ]),
  );
  return { content, targets };
}

/** Lo que hace cada consumidor con los nodos del árbol. `C` es lo que pasa de un nivel al siguiente (el camino, por ejemplo). */
export interface ScopeVisitor<N, C> {
  /** Una página con destino en la ruta (una hoja o la página propia de un grupo); `undefined` la deja fuera. */
  page(node: SidebarLeaf | SidebarGroup, target: NavTarget, context: C): N | undefined;
  /** Un grupo con su página propia (si la tiene y se visitó) y sus hijas ya visitadas; `[]` lo poda. */
  group(group: SidebarGroup, own: N | undefined, items: N[], context: C): N[];
  /** El contexto de las hijas de `group`; sin él, el mismo. */
  inside?(group: SidebarGroup, context: C): C;
}

/** Recorre el árbol del contenido en orden; la página propia de cada grupo se visita antes que sus hijas. */
export function walkScope<N, C>(trees: ScopeTrees, visitor: ScopeVisitor<N, C>, context: C): N[] {
  function walk(nodes: SidebarNode[], current: C): N[] {
    return nodes.flatMap((node): N[] => {
      const target = node.slug === undefined ? undefined : trees.targets.get(node.slug);
      const own = target && visitor.page(node, target, current);
      if (!isSidebarGroup(node)) return own === undefined ? [] : [own];
      const items = walk(node.items, visitor.inside?.(node, current) ?? current);
      return visitor.group(node, own, items, current);
    });
  }
  return walk(trees.content, context);
}

/** Texto de una página en un listado: su descripción SEO en `locale` o, con `preferSummary`, antes su `index.summary`. */
export function pageBlurb(
  page: Page | undefined,
  locale: Locale,
  { defaultLocale, preferSummary = false }: { defaultLocale: Locale; preferSummary?: boolean },
): string | undefined {
  if (preferSummary && page?.index?.summary) return page.index.summary;
  const description = page?.seo?.description;
  if (description === undefined) return undefined;
  return resolveLabel(description, locale, defaultLocale) || undefined;
}
