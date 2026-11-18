import type { APIRoute } from 'astro';
import { getDocs } from '../data/docs-collection';
import { sitemapXml } from '../views/pages';
import { loadClientSitemapEntries } from '../data/client-pages';
import { siteConfig } from '../data/site-config';

/** Las páginas propias cuando `sitemap.xml` es un índice; solo se inyecta con `sitemap.include`. */
export const GET: APIRoute = async ({ url }) => {
  const data = (await getDocs()).map((entry) => entry.data);
  // En dev, las páginas de `src/pages/`; en el build las añade `astro:build:done` desde `dist/`.
  const client = await loadClientSitemapEntries({
    origin: url.origin,
    site: siteConfig.site,
    base: siteConfig.base,
  });
  return new Response(sitemapXml(data, siteConfig, client), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
