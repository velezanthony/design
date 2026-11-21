import type { Page } from '../../core/content/discovery';
import { buildAvailability } from '../../core/i18n/availability';
import { noindexUrls } from '../../core/seo/indexable';
import { pageLastmods } from '../../core/seo/lastmod';
import {
  buildSitemap,
  buildSitemapIndex,
  SITEMAP_PAGES,
  sitemapIncludes,
  type SitemapEntry,
} from '../../core/seo/sitemap';
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
    ...(item.listing && { listing: true as const }),
    ...(item.index && { index: pageIndexOf(item.index) }),
  };
}

/** El bloque `index` que entiende el núcleo; la portada guardada se queda en los datos (la lee la vista del índice). */
function pageIndexOf(index: NonNullable<DocData['index']>): Page['index'] {
  return Object.fromEntries(
    Object.entries(index).filter(([key, value]) => key !== 'cover' && value !== undefined),
  ) as Page['index'];
}

export function pagesOf(data: DocData[]): Page[] {
  return data.map(pageOf);
}

/** Único `sitemap.xml`: solo páginas REALES e indexables, con alternates; un fallo del núcleo sale como `AstroError`. */
export function sitemapXml(
  data: DocData[],
  config: Pick<VirtualConfig, 'base' | 'trailingSlash' | 'defaultLocale' | 'site'>,
  /** Las páginas del cliente (`src/pages/`), ya decididas, que van después de las de la documentación. */
  extra: readonly SitemapEntry[] = [],
  /** Fecha de cada archivo de página por su `sourcePath`, para el `lastmod`. */
  dates: ReadonlyMap<string, string> = new Map(),
): string {
  const pages = pagesOf(data);
  const url = urlPolicyOf(config, config.defaultLocale);
  const availability = buildAvailability(pages, url);
  return orAstroError('No se puede generar sitemap.xml.', () =>
    buildSitemap(
      availability,
      new URL(config.site),
      noindexUrls(pages, url),
      extra,
      pageLastmods(pages, url, dates),
    ),
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
