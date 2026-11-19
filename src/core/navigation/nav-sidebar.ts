import type { NavItem } from '../config/nav';
import { isNavSection } from '../config/nav';
import type { ResolvedConfig } from '../config/resolve';
import type { Page } from '../content/discovery';
import type { Availability, UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import type { TranslationPolicies } from '../i18n/translation-policy';
import { sectionIndexOf, sectionOwns } from './nav-sections';
import { buildSidebar, type SidebarNode } from './sidebar';

/** Lo que el árbol y la cabecera necesitan de la config. */
export type NavConfig = Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'sidebar'> & {
  nav?: NavItem[];
};

/** Todo lo que hace falta para construir árboles y entradas de cabecera de una página. */
export interface NavContext {
  pages: Page[];
  availability: Availability;
  locale: Locale;
  config: NavConfig;
  policies: TranslationPolicies;
  url: UrlPolicy;
  /** Slug de la página que se renderiza: decide a qué sección pertenece. */
  slug: string;
}

/** Árbol de las páginas que cumplen `keep`, con el orden declarado en `sidebar` y la carpeta `base` como raíz. */
export function buildSidebarFor(
  context: NavContext,
  keep: (slug: string) => boolean,
  sidebar?: NavConfig['sidebar'],
  base = '',
): SidebarNode[] {
  const availability: Availability = new Map(
    [...context.availability].filter(([slug]) => keep(slug)),
  );
  const pages = context.pages.filter((page) => keep(page.slug));
  return buildSidebar(
    pages,
    availability,
    context.locale,
    { ...context.config, sidebar },
    context.policies,
    context.url,
    base,
  );
}

/** Árbol de la sección `index` de `nav`, o el de las páginas sin sección si es `-1`. */
export function buildSectionSidebar(context: NavContext, index: number): SidebarNode[] {
  const nav = context.config.nav;
  const item = nav?.[index];
  if (item && isNavSection(item)) {
    return buildSidebarFor(context, (slug) => sectionOwns(item, slug), item.sidebar, item.dir);
  }
  return buildSidebarFor(
    context,
    (slug) => sectionIndexOf(nav, slug) === -1,
    context.config.sidebar,
  );
}

/** Barra lateral de `context.slug`: con `nav`, la de su sección o la de las páginas sin sección. */
export function buildScopedSidebar(context: NavContext): SidebarNode[] {
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
  return buildSectionSidebar(context, sectionIndexOf(context.config.nav, context.slug));
}
