import type { APIRoute } from 'astro';
import config from 'virtual:@velezanthony/design/config';
import type { Page } from '../../core/content/discovery';
import { buildAvailability, type UrlPolicy } from '../../core/i18n/availability';
import { noindexUrls } from '../../core/seo/indexable';
import { buildSitemap } from '../../core/seo/sitemap';
import { toAstroError } from '../integration/errors';
import { getDocs } from './docs-collection';

/** El único `sitemap.xml` del sitio: solo páginas reales (ni rutas de reserva ni 404). */
export const GET: APIRoute = async () => {
  const entries = await getDocs();
  // El sitemap solo necesita slug, idioma y `seo.noindex`; el resto del `Page` no interviene.
  const pages = entries.map(
    ({ data }) =>
      ({
        slug: data.slug,
        locale: data.locale,
        title: data.title,
        kind: 'native',
        sourcePath: data.sourcePath,
        body: '',
        seo: data.seo,
      }) satisfies Page,
  );
  const url: UrlPolicy = {
    base: config.base,
    trailingSlash: config.trailingSlash,
    defaultLocale: config.defaultLocale,
  };
  try {
    const xml = buildSitemap(
      buildAvailability(pages, url),
      new URL(config.site),
      noindexUrls(pages, url),
    );
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  } catch (error) {
    throw toAstroError(error, 'No se puede generar sitemap.xml.');
  }
};
