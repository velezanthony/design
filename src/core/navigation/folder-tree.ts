import { isNavSection } from '../config/nav';
import type { Locale } from '../i18n/locale';
import { sectionFolders } from './folder-labels';
import { resolveLabel } from './label';
import { buildSidebarFor, type NavContext } from './nav-sidebar';
import { navScopes, scopeTrees, walkScope, type ScopeVisitor } from './nav-walk';
import { flatten, type SidebarGroup, type SidebarLeaf, type SidebarNode } from './sidebar';

/* El árbol completo de una carpeta (`tree.show: 'all'`): arriba la página de la carpeta; después, cada
   sección de `nav` con páginas dentro de ella como grupo de primer nivel (con su etiqueta, su árbol y,
   si la tiene, la página de su carpeta como destino), y al final las páginas sin sección de la carpeta
   con su árbol automático. Sale del recorrido común de `nav-walk.ts`: textos del idioma del contenido y
   URLs de la ruta, como `::nav-tree` y los listados. */

/** ¿Cuelga `slug` de `folder` (sin ser su página)? La raíz del contenido (`''`) lo abarca todo. */
function inside(folder: string, slug: string): boolean {
  if (slug === folder) return false;
  return folder === '' || slug.startsWith(`${folder}/`);
}

/** La hoja de una sola página en el idioma de la ruta, con el título del contenido; `undefined` si la política la omite. */
function pageLeaf(
  context: NavContext,
  slug: string,
  contentLocale: Locale,
): SidebarLeaf | undefined {
  // `base` es la propia página: así una página que lista su carpeta sale como hoja.
  function only(locale: Locale) {
    return flatten(
      buildSidebarFor({ ...context, locale }, (other) => other === slug, undefined, slug),
    )[0];
  }
  const route = only(context.locale);
  if (!route) return undefined;
  const content = contentLocale === context.locale ? route : only(contentLocale);
  return { ...route, label: content?.label ?? route.label };
}

/** Árbol completo de `folder` para la barra lateral; `contentLocale` (por defecto el de la ruta) pone los textos. */
export function buildFolderTree(
  context: NavContext,
  folder: string,
  contentLocale: Locale = context.locale,
): SidebarNode[] {
  const visitor: ScopeVisitor<SidebarNode, undefined> = {
    page(node, target) {
      if (node.slug === undefined || !inside(folder, node.slug)) return undefined;
      return {
        label: node.label,
        slug: node.slug,
        href: target.href,
        ...(target.badge && { badge: target.badge }),
      };
    },
    group(group, own, items) {
      // El grupo de la propia carpeta (o de una de encima) no es un nivel: su página ya va arriba.
      if (group.slug === folder || (group.dir !== undefined && !inside(folder, group.dir))) {
        return items;
      }
      if (items.length === 0) return own ? [own] : [];
      const node: SidebarGroup = {
        label: group.label,
        ...(group.dir !== undefined && { dir: group.dir }),
        ...(own && { slug: own.slug, href: (own as SidebarLeaf).href }),
        ...(own && (own as SidebarLeaf).badge && { badge: (own as SidebarLeaf).badge }),
        items,
      };
      return [node];
    },
  };
  const nav = context.config.nav ?? [];
  const ownFolders = sectionFolders(context.config);
  const tree: SidebarNode[] = [];
  const top = pageLeaf(context, folder, contentLocale);
  if (top) tree.push(top);
  for (const scope of navScopes(context.config.nav)) {
    const item = scope.kind === 'section' ? nav[scope.position] : undefined;
    // Sin `dir`, el árbol de la sección (y el de las páginas sin sección) cuenta desde la carpeta.
    const trees = scopeTrees(context, contentLocale, scope, folder);
    const nodes = walkScope(trees, visitor, undefined);
    if (nodes.length === 0) continue;
    if (!item || !isNavSection(item)) {
      tree.push(...nodes);
      continue;
    }
    const sectionFolder = ownFolders.get(item);
    const own =
      sectionFolder !== undefined && inside(folder, sectionFolder)
        ? pageLeaf(context, sectionFolder, contentLocale)
        : undefined;
    tree.push({
      label: resolveLabel(item.label, contentLocale, context.config.defaultLocale),
      ...(own && { slug: own.slug, href: own.href }),
      ...(own?.badge && { badge: own.badge }),
      items: nodes,
    });
  }
  return tree;
}
