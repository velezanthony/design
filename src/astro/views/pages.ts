import { pagesOf } from '../../core/content/stored-page';
import {
  buildSitemapIndex,
  pagesSitemapXml,
  SITEMAP_PAGES,
  sitemapIncludes,
  type SitemapEntry,
} from '../../core/seo/sitemap';
import { urlPolicyOf } from '../config';
import { orAstroError } from '../errors';
import type { DocData } from '../loader/schema';
import type { VirtualConfig } from '../virtual/data';
import { withBase } from '../../core/shared/urls';
import type { ConfigPick } from '../../core/config/resolve';

/** Único `sitemap.xml`: solo páginas REALES e indexables, con alternates; un fallo del núcleo sale como `AstroError`. */
export function sitemapXml(
  data: DocData[],
  config: Pick<VirtualConfig, 'base' | 'trailingSlash' | 'siteUrl'> &
    ConfigPick<never, 'defaultLocale'>,
  /** Las páginas del cliente (`src/pages/`), ya decididas, que van después de las de la documentación. */
  extra: readonly SitemapEntry[] = [],
  /** Fecha de cada archivo de página por su `sourcePath`, para el `lastmod`. */
  dates: ReadonlyMap<string, string> = new Map(),
): string {
  const url = urlPolicyOf(config, config.i18n.defaultLocale);
  return orAstroError('No se puede generar sitemap.xml.', () =>
    pagesSitemapXml(pagesOf(data), { url, site: new URL(config.siteUrl), extra, dates }),
  );
}

/** `sitemap.xml` como índice (con `sitemap.include`): el de las páginas propias y luego los demás del dominio. */
export function sitemapIndexXml(
  config: Pick<VirtualConfig, 'base' | 'siteUrl'> & ConfigPick<'seo'>,
): string {
  const site = new URL(config.siteUrl);
  const pages = new URL(withBase(config.base, `/${SITEMAP_PAGES}`), site.origin).href;
  return orAstroError('No se puede generar el índice sitemap.xml.', () =>
    buildSitemapIndex([
      pages,
      ...sitemapIncludes(config.site.seo.sitemap.include, site, config.base),
    ]),
  );
}
