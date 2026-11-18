import type { ResolvedConfig } from '../../config/resolve';
import type { Page } from '../../content/discovery';
import type { Availability, UrlPolicy } from '../../i18n/availability';
import type { TranslationPolicies } from '../../i18n/translation-policy';
import { footerPageHrefs } from '../../navigation/footer';
import { buildNav } from '../../navigation/nav-entries';
import { buildSectionSidebar, type NavContext } from '../../navigation/nav-sidebar';
import { sectionIndexOf } from '../../navigation/nav-sections';
import { flatten } from '../../navigation/sidebar';
import type { PageLink } from '../tree/types';
import { pageKey } from '../tree/keys';

/** Lo que la navegación necesita de la config: la misma porción que usa el layout. */
type NavigationConfig = Pick<
  ResolvedConfig,
  'locales' | 'defaultLocale' | 'sidebar' | 'nav' | 'footer' | 'translations'
>;

/**
 * A qué páginas enlaza la NAVEGACIÓN de cada página (barra lateral de su sección, cabecera y
 * footer), por clave `slug\0idioma`. Se construye con los mismos árboles que pinta el layout
 * (`buildScopedSidebar` en el fondo), no con una regla aparte: lo que el panel cuenta como enlace
 * es lo que el visitante tiene delante. Los destinos que no son páginas reales (rutas de reserva,
 * enlaces externos) quedan fuera, y una página no se cuenta a sí misma.
 */
export function navigationLinks(
  pages: Page[],
  config: NavigationConfig,
  // Lo que `buildSeoTree` ya calculó: aquí no se repite.
  {
    url,
    availability,
    policies,
  }: { url: UrlPolicy; availability: Availability; policies: TranslationPolicies },
): Map<string, PageLink[]> {
  const byHref = new Map<string, PageLink>();
  for (const page of pages) {
    byHref.set((availability.get(page.slug) ?? {})[page.locale] ?? '', {
      slug: page.slug,
      locale: page.locale,
    });
  }

  // Dependen del idioma y de la sección, no de la página: se calculan una vez por par.
  const shared = new Map<string, string[]>();
  function hrefsFor(page: Page, index: number): string[] {
    const key = `${page.locale}\u0000${index}`;
    const cached = shared.get(key);
    if (cached) return cached;
    const context: NavContext = {
      pages,
      availability,
      locale: page.locale,
      config,
      policies,
      url,
      slug: page.slug,
    };
    const hrefs = [
      ...flatten(buildSectionSidebar(context, index)).map((leaf) => leaf.href),
      ...buildNav(config.nav, context)
        .filter((entry) => !entry.external)
        .map((entry) => entry.href),
      ...footerPageHrefs(config.footer?.links, context),
    ];
    shared.set(key, hrefs);
    return hrefs;
  }

  const result = new Map<string, PageLink[]>();
  for (const page of pages) {
    const seen = new Set<string>();
    const targets: PageLink[] = [];
    for (const href of hrefsFor(page, sectionIndexOf(config.nav, page.slug))) {
      const target = byHref.get(href);
      if (!target) continue;
      const key = pageKey({ slug: target.slug, locale: target.locale });
      if (key === pageKey({ slug: page.slug, locale: page.locale }) || seen.has(key)) continue;
      seen.add(key);
      targets.push(target);
    }
    result.set(pageKey({ slug: page.slug, locale: page.locale }), targets);
  }
  return result;
}
