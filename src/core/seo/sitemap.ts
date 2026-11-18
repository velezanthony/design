import { DocsError } from '../errors';
import type { Availability } from '../i18n/availability';
import { excludeNoindex } from './indexable';

/**
 * Hoja de estilo del sitemap, bajo `/_design/` (como el favicon) para no chocar con un `public/` del
 * consumidor. Es CSS y no XSLT: Chrome retira XSLT, y Google ignora la instrucción en ambos casos.
 */
export const SITEMAP_STYLESHEET_PATH = '/_design/sitemap.css';

/** Las páginas propias cuando `sitemap.xml` es un índice (con `sitemap.include`). */
export const SITEMAP_PAGES = 'sitemap-pages.xml';

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
  return xmlDocument(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries,
    '</urlset>',
  );
}

/** Declaración, hoja de estilo, raíz y entradas: lo común al sitemap de páginas y al índice. */
const xmlDocument = (open: string, entries: string[], close: string) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    // Relativa: el sitemap vive en la raíz de `base`, así que resuelve igual con o sin base.
    `<?xml-stylesheet type="text/css" href="${SITEMAP_STYLESHEET_PATH.slice(1)}"?>`,
    open,
    ...entries,
    close,
    '',
  ].join('\n');

/** El índice de sitemaps: un `<sitemap>` por URL absoluta, en el orden dado. */
export function buildSitemapIndex(urls: readonly string[]): string {
  return xmlDocument(
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.map((loc) => `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`),
    '</sitemapindex>',
  );
}

/**
 * Los sitemaps de `sitemap.include` como URLs absolutas. Una ruta (`/lib/sitemap.xml`) se resuelve
 * contra el ORIGEN del sitio, no contra su base: en GitHub Pages cada proyecto es una carpeta del
 * mismo dominio. Lanza si una es de otro dominio (el protocolo solo admite sitemaps del mismo sitio)
 * o si es el propio índice o el de páginas, que se apuntarían a sí mismos.
 */
export function sitemapIncludes(include: readonly string[], site: URL, base = '/'): string[] {
  const root = `${base.replace(/\/$/, '')}/`;
  const own = new Set(
    ['sitemap.xml', SITEMAP_PAGES].map((file) => new URL(`${root}${file}`, site.origin).href),
  );
  return include.map((entry, index) => {
    const url = new URL(entry, site.origin);
    if (url.origin !== site.origin) {
      throw new DocsError(
        `sitemap.include[${index}]: «${entry}» es de otro dominio (${url.origin}); el índice solo admite sitemaps de ${site.origin}.`,
        {
          hint: 'Escribe la ruta del sitemap dentro del dominio, por ejemplo `/proyecto/sitemap.xml`.',
        },
      );
    }
    if (own.has(url.href)) {
      throw new DocsError(
        `sitemap.include[${index}]: «${entry}» es el propio índice o el sitemap de páginas, que ya están.`,
        { hint: 'Incluye solo los sitemaps de otros sitios del dominio.' },
      );
    }
    return url.href;
  });
}
