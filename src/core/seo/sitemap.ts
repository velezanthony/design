import { DocsError } from '../errors';
import type { Availability } from '../i18n/availability';
import { excludeNoindex } from './indexable';

/** Un único `sitemap.xml` admite hasta 50 000 URLs (protocolo sitemaps.org). */
export const SITEMAP_LIMIT = 50_000;

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Sitemap de las páginas REALES indexables, con sus alternates `xhtml:link` por idioma. Las rutas
 * de reserva y la 404 no están en `av`, así que no aparecen. Las URLs en `noindex` se excluyen y
 * se quitan de los alternates de sus gemelas. Lanza si hay más URLs de las que cabe en un archivo.
 */
export function buildSitemap(
  av: Availability,
  site: URL,
  noindex: ReadonlySet<string> = new Set(),
): string {
  const indexable = excludeNoindex(av, noindex);
  const total = [...indexable.values()].reduce((sum, a) => sum + Object.keys(a).length, 0);
  if (total > SITEMAP_LIMIT) {
    throw new DocsError(
      `El sitemap tiene ${total} URLs y un sitemap.xml admite como máximo ${SITEMAP_LIMIT}.`,
      {
        hint: 'Reduce las páginas indexables o marca algunas con `seo.noindex`.',
      },
    );
  }
  const absolute = (href: string) => escapeXml(new URL(href, site).href);
  const entries: string[] = [];
  for (const available of indexable.values()) {
    const languages = Object.entries(available).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    );
    const alternates =
      languages.length > 1
        ? languages
            .map(
              ([locale, href]) =>
                `<xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${absolute(href)}"/>`,
            )
            .join('')
        : '';
    for (const [, href] of languages) {
      entries.push(`<url><loc>${absolute(href)}</loc>${alternates}</url>`);
    }
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
