import type { SeoPage, SeoTree } from '../../tree/types';
import { slugsOf } from '../../tree/keys';

export interface Indexing {
  /** Páginas (slugs). */
  pages: number;
  /** Con noindex en algún idioma, y el resto. */
  noindex: number;
  indexable: number;
  /** Entradas (página + idioma). */
  entries: number;
  /** URLs de contenido que lleva el sitemap. */
  sitemapUrls: number;
  /** Entradas cuyo canonical es su propia URL. */
  ownCanonical: number;
  /** Por qué una URL no se indexa, contado en entradas (página + idioma). */
  reasons: {
    /** Lo declara la página (`seo.noindex`). */
    noindex: number;
    /** El idioma no existe y se sirve otro bajo su ruta: no tiene URL propia que indexar. */
    fallback: number;
    /** Indexables que el sitemap no lleva: algo no cuadra. */
    outOfSitemap: number;
  };
}

interface Input {
  /** URLs de contenido del sitemap (sin las de privacidad, que no son páginas del árbol). */
  sitemapUrls: number;
  /** Idiomas servidos de respaldo, de la matriz de idiomas. */
  fallbacks: number;
}

/** El canonical propio es el de la propia URL, no el de otra página ni el de otro idioma. */
function hasOwnCanonical(page: SeoPage) {
  return page.locales.some(
    (entry) =>
      entry.locale === page.locale &&
      entry.status === 'present' &&
      entry.url === page.meta.canonical,
  );
}

/** «Fuera del sitemap» es una resta: el panel solo conoce cuántas URLs hay, no cuáles. */
export function indexing(tree: SeoTree, { sitemapUrls, fallbacks }: Input): Indexing {
  const slugs = slugsOf(tree.pages);
  const noindexSlugs = new Set(
    tree.pages.filter((page) => page.meta.noindex).map((page) => page.slug),
  );
  const noindexEntries = tree.pages.filter((page) => page.meta.noindex).length;
  return {
    pages: slugs.size,
    noindex: noindexSlugs.size,
    indexable: slugs.size - noindexSlugs.size,
    entries: tree.pages.length,
    sitemapUrls,
    ownCanonical: tree.pages.filter(hasOwnCanonical).length,
    reasons: {
      noindex: noindexEntries,
      fallback: fallbacks,
      outOfSitemap: Math.max(0, tree.pages.length - noindexEntries - sitemapUrls),
    },
  };
}
