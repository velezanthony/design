import type { APIRoute } from 'astro';
import { getDocs } from '../data/docs-collection';
import { sitemapIndexXml, sitemapXml } from '../views/pages';
import { loadClientSitemapEntries } from '../data/client-pages';
import { siteConfig } from '../data/site-config';

const XML = { 'Content-Type': 'application/xml; charset=utf-8' };

/**
 * El `sitemap.xml` del sitio. Sin `sitemap.include`, las páginas reales (ni rutas de reserva ni
 * 404). Con él, el índice: las páginas propias (`sitemap-pages.xml`) y los demás sitemaps del dominio.
 */
export const GET: APIRoute = async ({ url }) => {
  if (siteConfig.sitemap.include.length > 0) {
    return new Response(sitemapIndexXml(siteConfig), { headers: XML });
  }
  const data = (await getDocs()).map((entry) => entry.data);
  // En dev, las páginas de `src/pages/`; en el build las añade `astro:build:done` desde `dist/`.
  const client = await loadClientSitemapEntries({
    origin: url.origin,
    site: siteConfig.site,
    base: siteConfig.base,
  });
  return new Response(sitemapXml(data, siteConfig, client), { headers: XML });
};
