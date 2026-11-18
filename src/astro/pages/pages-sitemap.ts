import { getDocs } from '../data/docs-collection';
import { loadClientSitemapEntries } from '../data/client-pages';
import { siteConfig } from '../data/site-config';
import { sitemapXml } from '../views/pages';

export const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' };

/** Sitemap de las páginas propias; las de `src/pages/` solo en dev (en el build, `astro:build:done`). */
export async function pagesSitemapResponse(url: URL): Promise<Response> {
  const data = (await getDocs()).map((entry) => entry.data);
  const client = await loadClientSitemapEntries({
    origin: url.origin,
    site: siteConfig.site,
    base: siteConfig.base,
  });
  return new Response(sitemapXml(data, siteConfig, client), { headers: XML_HEADERS });
}
