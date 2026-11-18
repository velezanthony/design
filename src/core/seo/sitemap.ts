import { DocsError } from '../errors';
import type { ClientPage } from './client-pages';
import type { Availability } from '../i18n/availability';
import { excludeNoindex } from './indexable';
import { baseUrl } from '../shared/urls';

/** Hoja de estilo bajo `/_design/` para no chocar con `public/`; es CSS porque Chrome retira XSLT. */
export const SITEMAP_STYLESHEET_PATH = '/_design/sitemap.css';

/** El sitemap del sitio: las páginas o, con `sitemap.include`, el índice. */
export const SITEMAP_FILE = 'sitemap.xml';

/** Las páginas propias cuando `sitemap.xml` es un índice (con `sitemap.include`). */
export const SITEMAP_PAGES = 'sitemap-pages.xml';

/** Qué ficheros genera el sitio: si `sitemap.xml` es índice y dónde van las páginas propias. */
export function sitemapFiles(include: readonly string[]): { index: boolean; pages: string } {
  const index = include.length > 0;
  return { index, pages: index ? SITEMAP_PAGES : SITEMAP_FILE };
}

/** Un único `sitemap.xml` admite hasta 50 000 URLs (protocolo sitemaps.org). */
const SITEMAP_LIMIT = 50_000;

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sitemap de las páginas reales indexables con alternates por idioma; las `noindex` se excluyen y lanza si no caben en un archivo. */
export function buildSitemap(
  availability: Availability,
  site: URL,
  noindex: ReadonlySet<string> = new Set(),
  extra: readonly SitemapEntry[] = [],
): string {
  const indexable = excludeNoindex(availability, noindex);
  // Una página del cliente con la URL de una de la librería la sustituye: Astro publica la suya.
  const taken = new Set(extra.map(({ loc }) => loc));
  function absolute(href: string) {
    return escapeXml(new URL(href, site).href);
  }
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
      if (taken.has(new URL(href, site).href)) continue;
      entries.push(`<url><loc>${absolute(href)}</loc>${alternates}</url>`);
    }
  }
  const total = entries.length + extra.length;
  if (total > SITEMAP_LIMIT) {
    throw new DocsError(
      `El sitemap tiene ${total} URLs y un sitemap.xml admite como máximo ${SITEMAP_LIMIT}.`,
      {
        hint: 'Reduce las páginas indexables o marca algunas con `seo.noindex`.',
      },
    );
  }
  return xmlDocument(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    [...entries, ...extra.map(urlElement)],
    '</urlset>',
  );
}

/** Una URL del sitemap ya decidida, con sus versiones por idioma; todo absoluto. */
export interface SitemapEntry {
  loc: string;
  alternates: { hreflang: string; href: string }[];
}

function urlElement({ loc, alternates }: SitemapEntry) {
  return `<url><loc>${escapeXml(loc)}</loc>${alternates
    .map(
      ({ hreflang, href }) =>
        `<xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
    )
    .join('')}</url>`;
}

/** Páginas del cliente como entradas del sitemap: las indexables y canónicas de sí mismas, con los idiomas de su `hreflang`. */
export function clientSitemapEntries(pages: readonly ClientPage[], site: URL): SitemapEntry[] {
  return pages.flatMap(({ path, head }) => {
    const loc = new URL(path, site).href;
    if (head.noindex || (head.canonical !== undefined && head.canonical !== loc)) return [];
    return [{ loc, alternates: head.alternates }];
  });
}

/** Añade entradas a un sitemap ya escrito, antes del cierre, sustituyendo la que tenga la misma URL; las páginas del cliente solo se leen tras el build. */
export function appendToSitemap(xml: string, extra: readonly SitemapEntry[]): string {
  if (extra.length === 0) return xml;
  // La que ya estaba con la misma URL se quita: la del cliente la sustituye (una `<url>` por línea).
  const taken = new Set(extra.map(({ loc }) => `<url><loc>${escapeXml(loc)}</loc>`));
  const kept = xml
    .split('\n')
    .filter((line) => ![...taken].some((start) => line.startsWith(start)))
    .join('\n');
  const close = kept.lastIndexOf('</urlset>');
  return `${kept.slice(0, close)}${extra.map(urlElement).join('\n')}\n${kept.slice(close)}`;
}

/** Declaración, hoja de estilo, raíz y entradas: lo común al sitemap de páginas y al índice. */
function xmlDocument(open: string, entries: string[], close: string) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    // Relativa: el sitemap vive en la raíz de `base`, así que resuelve igual con o sin base.
    `<?xml-stylesheet type="text/css" href="${SITEMAP_STYLESHEET_PATH.slice(1)}"?>`,
    open,
    ...entries,
    close,
    '',
  ].join('\n');
}

/** El índice de sitemaps: un `<sitemap>` por URL absoluta, en el orden dado. */
export function buildSitemapIndex(urls: readonly string[]): string {
  return xmlDocument(
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.map((loc) => `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`),
    '</sitemapindex>',
  );
}

/** Sitemaps de `sitemap.include` como URLs absolutas contra el ORIGEN del sitio (en GitHub Pages cada proyecto es una carpeta); lanza si son de otro dominio o los propios. */
export function sitemapIncludes(include: readonly string[], site: URL, base = '/'): string[] {
  const root = baseUrl(base);
  const own = new Set(
    [SITEMAP_FILE, SITEMAP_PAGES].map((file) => new URL(`${root}${file}`, site.origin).href),
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
