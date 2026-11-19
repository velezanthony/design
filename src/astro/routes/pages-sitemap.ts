import { fileURLToPath } from 'node:url';
import { getDocData } from '../data/docs-collection';
import { loadClientPages, loadClientSitemapEntries } from '../data/client-pages';
import { lastModifiedDates } from '../data/last-modified';
import { siteConfig } from '../data/site-config';
import { sitemapXml } from '../views/pages';

export const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' };

/** Sitemap de las páginas propias; las de `src/pages/` solo en dev (en el build, `astro:build:done`). */
export async function pagesSitemapResponse(url: URL): Promise<Response> {
  const data = await getDocData();
  const where = { origin: url.origin, site: siteConfig.site, base: siteConfig.base };
  const { pages } = await loadClientPages(where);
  // Un solo git log para todos los archivos: los de la documentación y los de las páginas del cliente.
  const dates = await lastModifiedDates(fileURLToPath(siteConfig.root), [
    ...data.map(({ sourcePath }) => sourcePath),
    ...pages.map(({ entrypoint }) => entrypoint),
  ]);
  const client = await loadClientSitemapEntries(where, undefined, dates);
  return new Response(sitemapXml(data, siteConfig, client, dates), { headers: XML_HEADERS });
}
