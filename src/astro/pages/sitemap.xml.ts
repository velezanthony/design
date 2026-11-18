import type { APIRoute } from 'astro';
import { sitemapFiles } from '../../core/seo/sitemap';
import { siteConfig } from '../data/site-config';
import { sitemapIndexXml } from '../views/pages';
import { pagesSitemapResponse, XML_HEADERS } from './pages-sitemap';

/** El `sitemap.xml`: las páginas o, con `sitemap.include`, el índice de los sitemaps del dominio. */
export const GET: APIRoute = ({ url }) =>
  sitemapFiles(siteConfig.sitemap.include).index
    ? new Response(sitemapIndexXml(siteConfig), { headers: XML_HEADERS })
    : pagesSitemapResponse(url);
