import type { Label, SidebarItem } from './schema';

/** Iconos disponibles para un enlace externo de `nav`. Mismas cadenas en la config y en `Icon`. */
export const NavIcon = { GITHUB: 'github' } as const;
export type NavIcon = (typeof NavIcon)[keyof typeof NavIcon];

/** Sección de la cabecera: la forman las páginas de `dir` (su slug es `dir` o cuelga de `dir/`) y las que nombra `sidebar`, vivan donde vivan; `sidebar` fija además el orden. Sin `dir`, solo cuenta `sidebar`. */
export interface NavSection {
  label: Label;
  dir?: string;
  sidebar?: SidebarItem[];
  /** Niveles de grupos de carpeta del árbol automático de la sección, desde `dir`; gana a `sidebarDepth.default`. */
  sidebarDepth?: number;
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

export function isNavSection(item: NavItem): item is NavSection {
  return 'dir' in item || 'sidebar' in item;
}
export function isNavPage(item: NavItem): item is NavPage {
  return 'slug' in item;
}
export function isNavLink(item: NavItem): item is NavLink {
  return 'href' in item;
}
