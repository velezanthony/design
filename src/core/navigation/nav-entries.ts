import { isNavLink, isNavPage, isNavSection, type NavIcon, type NavItem } from '../config/nav';
import { pageUrl } from '../i18n/availability';
import { resolveLabel } from './label';
import { buildSectionSidebar, buildSidebarFor, type NavContext } from './nav-sidebar';
import { sectionIndexOf } from './nav-sections';
import { toSidebarSlug } from './sidebar-slugs';
import { flatten } from './sidebar';

export type { NavContext };

/** Un item de la cabecera ya resuelto para un idioma y una página. */
export interface NavEntry {
  label: string;
  href: string;
  kind: 'section' | 'page' | 'link';
  /** `page` si la entrada es la propia página; `true` si es la sección que la contiene. */
  current?: 'page' | 'true';
  external?: boolean;
  icon?: NavIcon;
}

/**
 * Items de la cabecera para una página. Un item sin destino en este idioma (su página no existe y
 * la política es `omit`) se quita en vez de dejar un enlace roto. Sin `nav` no hay entradas.
 */
export function buildNav(nav: readonly NavItem[] | undefined, ctx: NavContext): NavEntry[] {
  if (!nav) return [];
  const { locale, cfg } = ctx;
  const here = pageUrl(ctx.slug, locale, ctx.url);
  const currentSection = sectionIndexOf(nav, ctx.slug);
  const entries: NavEntry[] = [];

  nav.forEach((item, index) => {
    const label = resolveLabel(item.label, locale, cfg.defaultLocale);
    if (isNavLink(item)) {
      entries.push({
        label,
        href: item.href,
        kind: 'link',
        external: true,
        ...(item.icon && { icon: item.icon }),
      });
      return;
    }
    if (isNavPage(item)) {
      const slug = toSidebarSlug(item.slug);
      const leaf = flatten(buildSidebarFor(ctx, (candidate) => candidate === slug))[0];
      if (!leaf) return;
      entries.push({
        label,
        href: leaf.href,
        kind: 'page',
        ...(ctx.slug === slug && { current: 'page' as const }),
      });
      return;
    }
    if (!isNavSection(item)) return;
    const leaves = flatten(buildSectionSidebar(ctx, index));
    // Destino: la página índice del dir si existe; si no, la primera hoja que no sea un enlace a otro idioma.
    const landing =
      leaves.find((leaf) => leaf.slug === item.dir && !leaf.badge) ??
      leaves.find((leaf) => !leaf.badge) ??
      leaves[0];
    if (!landing) return;
    const current =
      currentSection === index ? (landing.href === here ? 'page' : 'true') : undefined;
    entries.push({
      label,
      href: landing.href,
      kind: 'section',
      ...(current && { current }),
    });
  });
  return entries;
}
