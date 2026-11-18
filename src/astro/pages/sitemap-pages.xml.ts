import type { APIRoute } from 'astro';
import { pagesSitemapResponse } from './pages-sitemap';

/** Las páginas propias cuando `sitemap.xml` es un índice; solo se inyecta con `sitemap.include`. */
export const GET: APIRoute = ({ url }) => pagesSitemapResponse(url);
