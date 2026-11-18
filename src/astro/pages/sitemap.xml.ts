import type { APIRoute } from 'astro';
import { getDocs } from '../data/docs-collection';
import { sitemapIndexXml, sitemapXml } from '../views/pages';
import { siteConfig } from '../data/site-config';

const XML = { 'Content-Type': 'application/xml; charset=utf-8' };

/**
 * El `sitemap.xml` del sitio. Sin `sitemap.include`, las páginas reales (ni rutas de reserva ni
 * 404). Con él, el índice: las páginas propias (`sitemap-pages.xml`) y los demás sitemaps del dominio.
 */
export const GET: APIRoute = async () => {
  if (siteConfig.sitemap.include.length > 0) {
    return new Response(sitemapIndexXml(siteConfig), { headers: XML });
  }
  const data = (await getDocs()).map((entry) => entry.data);
  return new Response(sitemapXml(data, siteConfig), { headers: XML });
};
