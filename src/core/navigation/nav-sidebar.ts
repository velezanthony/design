import type { NavItem } from '../config/nav';
import { isNavSection } from '../config/nav';
import type { ResolvedConfig } from '../config/resolve';
import type { Page } from '../content/discovery';
import type { Availability, UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import type { TranslationPolicies } from '../i18n/translation-policy';
import { sectionIndexOf, slugInDir } from './nav-sections';
import { buildSidebar, type SidebarNode } from './sidebar';

/** Lo que el árbol y la cabecera necesitan de la config. */
export type NavConfig = Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'sidebar'> & {
  nav?: NavItem[];
};

/** Todo lo que hace falta para construir árboles y entradas de cabecera de una página. */
export interface NavContext {
  pages: Page[];
  av: Availability;
  locale: Locale;
  cfg: NavConfig;
  policies: TranslationPolicies;
  url: UrlPolicy;
  /** Slug de la página que se renderiza: decide a qué sección pertenece. */
  slug: string;
}

/** Árbol de las páginas que cumplen `keep`, con el orden declarado en `sidebar` y la carpeta `base` como raíz. */
export function buildSidebarFor(
  ctx: NavContext,
  keep: (slug: string) => boolean,
  sidebar?: NavConfig['sidebar'],
  base = '',
): SidebarNode[] {
  const av: Availability = new Map([...ctx.av].filter(([slug]) => keep(slug)));
  const pages = ctx.pages.filter((page) => keep(page.slug));
  return buildSidebar(pages, av, ctx.locale, { ...ctx.cfg, sidebar }, ctx.policies, ctx.url, base);
}

/** Árbol de la sección `index` de `nav`, o el de las páginas sin sección si es `-1`. */
export function buildSectionSidebar(ctx: NavContext, index: number): SidebarNode[] {
  const nav = ctx.cfg.nav;
  const item = nav?.[index];
  if (item && isNavSection(item)) {
    return buildSidebarFor(ctx, (slug) => slugInDir(item.dir, slug), item.sidebar, item.dir);
  }
  return buildSidebarFor(ctx, (slug) => sectionIndexOf(nav, slug) === -1, ctx.cfg.sidebar);
}

/**
 * Barra lateral de la página `ctx.slug`. Sin `nav` es la de siempre, con todas las páginas. Con
 * `nav`, solo la de su sección o, si no pertenece a ninguna, la de las páginas sin sección.
 */
export function buildScopedSidebar(ctx: NavContext): SidebarNode[] {
  if (!ctx.cfg.nav) {
    return buildSidebar(ctx.pages, ctx.av, ctx.locale, ctx.cfg, ctx.policies, ctx.url);
  }
  return buildSectionSidebar(ctx, sectionIndexOf(ctx.cfg.nav, ctx.slug));
}
