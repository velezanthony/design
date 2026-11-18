import type { Page } from '../../core/content/discovery';
import { buildAvailability } from '../../core/i18n/availability';
import { noindexUrls } from '../../core/seo/indexable';
import {
  buildSitemap,
  buildSitemapIndex,
  SITEMAP_PAGES,
  sitemapIncludes,
  type SitemapEntry,
} from '../../core/seo/sitemap';
import { privacyAvailability } from '../../core/privacy/pages';
import { urlPolicyOf } from '../config';
import { orAstroError } from '../errors';
import type { DocData } from '../loader/schema';
import type { VirtualConfig } from '../virtual/data';
import { withBase } from '../../core/shared/urls';

/** `Page` del núcleo a partir de los datos de la colección; el cuerpo no se arrastra. */
export function pageOf(item: DocData): Page {
  return {
    slug: item.slug,
    locale: item.locale,
    title: item.title,
    kind: item.kind ?? 'native',
    sourcePath: item.sourcePath,
    body: '',
    ...(item.order !== undefined && { order: item.order }),
    ...(item.seo && { seo: item.seo }),
    ...(item.translations && { translations: item.translations }),
  };
}

export function pagesOf(data: DocData[]): Page[] {
  return data.map(pageOf);
}

/** Único `sitemap.xml`: solo páginas REALES e indexables (más privacidad si es propia), con alternates; un fallo del núcleo sale como `AstroError`. */
export function sitemapXml(
  data: DocData[],
  config: Pick<VirtualConfig, 'base' | 'trailingSlash' | 'defaultLocale' | 'site' | 'locales'> & {
    privacy: Pick<VirtualConfig['privacy'], 'page'>;
  },
  /** Las páginas del cliente (`src/pages/`), ya decididas, que van después de las de la documentación. */
  extra: readonly SitemapEntry[] = [],
): string {
  const pages = pagesOf(data);
  const url = urlPolicyOf(config, config.defaultLocale);
  const availability = buildAvailability(pages, url);
  // La página de privacidad propia no es contenido: se suma aquí, con su hreflang entre idiomas.
  if (config.privacy.page) {
    for (const [key, urls] of privacyAvailability(config.locales, url)) availability.set(key, urls);
  }
  return orAstroError('No se puede generar sitemap.xml.', () =>
    buildSitemap(availability, new URL(config.site), noindexUrls(pages, url), extra),
  );
}

/** `sitemap.xml` como índice (con `sitemap.include`): el de las páginas propias y luego los demás del dominio. */
export function sitemapIndexXml(config: Pick<VirtualConfig, 'base' | 'site' | 'sitemap'>): string {
  const site = new URL(config.site);
  const pages = new URL(withBase(config.base, `/${SITEMAP_PAGES}`), site.origin).href;
  return orAstroError('No se puede generar el índice sitemap.xml.', () =>
    buildSitemapIndex([pages, ...sitemapIncludes(config.sitemap.include, site, config.base)]),
  );
}
