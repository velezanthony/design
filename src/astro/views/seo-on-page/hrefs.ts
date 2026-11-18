import { pageUrl, type UrlPolicy } from '../../../core/i18n/availability';
import type { Locale } from '../../../core/i18n/locale';
import {
  EMPTY_FILTERS,
  serializeFilters,
  type SeoFilters,
  type ViewState,
} from '../../../core/seo-on-page/queries/url-filters';

/** Carpeta común de las rutas del panel: lo que un consumidor no debería usar para sus páginas. */
export const SEO_ON_PAGE_DIR = 'seo-on-page';

/** Las rutas que la integración inyecta SOLO en desarrollo, y el contenedor de cada una. */
export const SEO_ON_PAGE_ROUTES = [
  { pattern: `/${SEO_ON_PAGE_DIR}`, file: 'overview.astro' },
  { pattern: `/${SEO_ON_PAGE_DIR}/pages`, file: 'pages.astro' },
  { pattern: `/${SEO_ON_PAGE_DIR}/page`, file: 'page.astro' },
] as const;

const withQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
};

/**
 * Enlaces entre las pantallas del panel. Se forman con `pageUrl` (el mismo que usa el sitio), así
 * respetan `base` y `trailingSlash` y funcionan con cualquier config; el idioma por defecto evita
 * que se les añada un prefijo de idioma.
 */
export function devHrefs(url: UrlPolicy) {
  const at = (route: string) => pageUrl(`${SEO_ON_PAGE_DIR}/${route}`, url.defaultLocale, url);
  return {
    siteHome: () => pageUrl('', url.defaultLocale, url),
    overview: () => pageUrl(SEO_ON_PAGE_DIR, url.defaultLocale, url),
    pages: (filters?: SeoFilters, page = 1, perPage?: number, view?: ViewState) =>
      withQuery(at('pages'), serializeFilters(filters ?? EMPTY_FILTERS, page, perPage, view)),
    /** El inspector identifica la página por slug (vacío = portada) e idioma. */
    inspector: (page: { slug: string; locale: Locale }) =>
      withQuery(at('page'), new URLSearchParams({ slug: page.slug, locale: page.locale })),
  };
}

export type DevHrefs = ReturnType<typeof devHrefs>;

/** `src` de una imagen para el navegador: la local cuelga de `base` (igual que `og:image`), la https no se toca. */
export const assetHref = (base: string, src: string) =>
  src.startsWith('https://') ? src : `${base.replace(/\/+$/, '')}${src}`;
