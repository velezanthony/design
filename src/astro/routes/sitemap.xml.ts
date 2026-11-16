import type { APIRoute } from 'astro';
import { getDocs } from './docs-collection';
import { sitemapXml } from './pages';
import { siteConfig } from './site-config';

/** El único `sitemap.xml` del sitio: solo páginas reales (ni rutas de reserva ni 404). */
export const GET: APIRoute = async () => {
  const data = (await getDocs()).map((entry) => entry.data);
  return new Response(sitemapXml(data, siteConfig), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
