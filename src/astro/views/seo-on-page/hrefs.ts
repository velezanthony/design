import { pageUrl, type UrlPolicy } from '../../../core/i18n/availability';
import type { Locale } from '../../../core/i18n/locale';
import {
  EMPTY_FILTERS,
  serializeFilters,
  type SeoFilters,
  type ViewState,
} from '../../../core/seo-on-page/queries/url-filters';
import { withBase } from '../../../core/shared/urls';
import { SEO_ON_PAGE_DIR } from '../../pages/routes';

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
}

/** Enlaces del panel con `pageUrl`, para respetar `base` y `trailingSlash`; el idioma por defecto evita el prefijo. */
export function devHrefs(url: UrlPolicy) {
  function at(route: string) {
    return pageUrl(`${SEO_ON_PAGE_DIR}/${route}`, url.defaultLocale, url);
  }
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
export function assetHref(base: string, src: string) {
  return src.startsWith('https://') ? src : withBase(base, src);
}
