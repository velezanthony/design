import type { Label, SidebarItem } from './schema';

/** Iconos disponibles para un enlace externo de `nav`. Mismas cadenas en la config y en `Icon`. */
export const NavIcon = { GITHUB: 'github' } as const;
export type NavIcon = (typeof NavIcon)[keyof typeof NavIcon];

/**
 * Sección de la cabecera: toda página (nativa o externa) cuyo slug es `dir` o cuelga de `dir/`
 * pertenece a ella. Su barra lateral muestra solo esas páginas; `sidebar` fija el orden.
 */
export interface NavSection {
  label: Label;
  dir: string;
  sidebar?: SidebarItem[];
}

/** Enlace a una sola página (`changelog`). Esa página no pertenece a ninguna sección. */
export interface NavPage {
  label: Label;
  slug: string;
}

/** Enlace externo, solo https. Con `icon` se pinta solo el icono y la etiqueta queda para lectores de pantalla. */
export interface NavLink {
  label: Label;
  href: string;
  icon?: NavIcon;
}

export type NavItem = NavSection | NavPage | NavLink;

export const isNavSection = (item: NavItem): item is NavSection => 'dir' in item;
export const isNavPage = (item: NavItem): item is NavPage => 'slug' in item;
export const isNavLink = (item: NavItem): item is NavLink => 'href' in item;
