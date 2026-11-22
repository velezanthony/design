import type { NavItem } from '../config/nav';
import { isNavSection } from '../config/nav';
import type { ResolvedConfig } from '../config/resolve';
import type { SidebarItem } from '../config/schema';
import { ALL_FOLDERS, folderSettings, TreeShow, type ResolvedFolders } from '../config/folders';
import { buildFolderTree } from './folder-tree';
import type { Page } from '../content/discovery';
import type { Availability, UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import type { TranslationPolicies } from '../i18n/translation-policy';
import { groupFolders } from './folder-labels';
import { sectionIndexOf, sectionOwns } from './nav-sections';
import { buildSidebar, type SidebarNode } from './sidebar';

/** Lo que el árbol y la cabecera necesitan de la config. */
export type NavConfig = Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'sidebar'> & {
  nav?: NavItem[];
  /** Ajustes por carpeta (`tree.depth`); sin ellos, sin límite. */
  folders?: ResolvedFolders;
};

/** Todo lo que hace falta para construir árboles y entradas de cabecera de una página. */
export interface NavContext {
  pages: Page[];
  availability: Availability;
  locale: Locale;
  config: NavConfig;
  policies: TranslationPolicies;
  url: UrlPolicy;
  /** Identidad de la página que se renderiza: decide a qué sección pertenece. */
  slug: string;
  /** URL de la ruta sin idioma ni base, si no es la de su identidad (un `slug` propio o una reserva). */
  urlSlug?: string;
}

/** Árbol de las páginas que cumplen `keep`, con el orden declarado en `sidebar` y la carpeta `base` como raíz; la profundidad sale de `folders` (`tree.depth`). */
export function buildSidebarFor(
  context: NavContext,
  keep: (slug: string) => boolean,
  sidebar?: NavConfig['sidebar'],
  base = '',
): SidebarNode[] {
  // La carpeta de cada grupo declarado sale de toda la config (`nav` y `sidebar`), no solo de este
  // árbol. La página de la carpeta de un grupo entra aunque el ámbito no sea su dueño: el grupo la enlaza.
  const folders = groupFolders(context.config);
  const linked = new Set(groupItems(sidebar ?? []).flatMap((item) => folders.get(item) ?? []));
  function included(slug: string) {
    return keep(slug) || linked.has(slug);
  }
  const availability: Availability = new Map(
    [...context.availability].filter(([slug]) => included(slug)),
  );
  const pages = context.pages.filter((page) => included(page.slug));
  return buildSidebar(
    pages,
    availability,
    context.locale,
    { ...context.config, sidebar, groupFolders: folders },
    context.policies,
    context.url,
    base,
  );
}

/** Los grupos declarados de unos items, a cualquier profundidad. */
function groupItems(items: readonly SidebarItem[]): Exclude<SidebarItem, string>[] {
  return items.flatMap((item) =>
    typeof item === 'string' ? [] : [item, ...groupItems(item.items ?? [])],
  );
}

/** Un ámbito de la navegación: una sección de `nav` (por su posición) o las páginas que no cuelgan de ninguna. */
export type NavScope = { kind: 'section'; position: number } | { kind: 'unsectioned' };

/** El ámbito al que pertenece la página `slug`. */
export function navScopeOf(nav: readonly NavItem[] | undefined, slug: string): NavScope {
  const position = sectionIndexOf(nav, slug);
  return position === -1 ? { kind: 'unsectioned' } : { kind: 'section', position };
}

/** Árbol de un ámbito: el de su sección de `nav` o el de las páginas sin sección. Una posición que no es una sección cuenta como «sin sección». `base` es la raíz del árbol si el ámbito no tiene `dir` (la carpeta de un `tree.show: 'all'`). */
export function buildSectionSidebar(
  context: NavContext,
  scope: NavScope,
  base = '',
): SidebarNode[] {
  const nav = context.config.nav;
  const item = scope.kind === 'section' ? nav?.[scope.position] : undefined;
  if (item && isNavSection(item)) {
    return buildSidebarFor(
      context,
      (slug) => sectionOwns(item, slug),
      item.sidebar,
      item.dir ?? base,
    );
  }
  return buildSidebarFor(
    context,
    (slug) => sectionIndexOf(nav, slug) === -1,
    context.config.sidebar,
    base,
  );
}

/** Barra lateral de `context.slug`: el árbol completo de la carpeta que declara `tree.show: 'all'` si rige en la página; si no, con `nav`, la de su sección o la de las páginas sin sección. */
export function buildScopedSidebar(context: NavContext): SidebarNode[] {
  const { folders } = context.config;
  const show = folders && folderSettings(folders, context.slug).tree.show;
  if (show?.value === TreeShow.ALL && show.declaredAt !== undefined) {
    return buildFolderTree(context, show.declaredAt === ALL_FOLDERS ? '' : show.declaredAt);
  }
  if (!context.config.nav) {
    return buildSidebar(
      context.pages,
      context.availability,
      context.locale,
      context.config,
      context.policies,
      context.url,
    );
  }
  return buildSectionSidebar(context, navScopeOf(context.config.nav, context.slug));
}
