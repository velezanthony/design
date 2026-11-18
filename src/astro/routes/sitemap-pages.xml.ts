import type { APIContext } from 'astro';
import { pagesSitemapResponse } from './pages-sitemap';

/** Las páginas propias cuando `sitemap.xml` es un índice; solo se inyecta con `sitemap.include`. */
export function GET({ url }: APIContext) {
  return pagesSitemapResponse(url);
}
