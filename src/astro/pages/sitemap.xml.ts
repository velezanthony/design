import type { APIRoute } from 'astro';
import { getDocs } from '../data/docs-collection';
import { sitemapXml } from '../views/pages';
import { siteConfig } from '../data/site-config';

/** El único `sitemap.xml` del sitio: solo páginas reales (ni rutas de reserva ni 404). */
export const GET: APIRoute = async () => {
  const data = (await getDocs()).map((entry) => entry.data);
  return new Response(sitemapXml(data, siteConfig), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
