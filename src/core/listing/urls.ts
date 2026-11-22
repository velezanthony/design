import type { Page } from '../content/discovery';
import { listsFolder } from '../content/generated-listings';
import { urlSlugOf } from '../content/slug';
import { DocsError } from '../errors';
import { pageUrl, type UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { pageCount } from '../shared/paginate';
import type { PagedListingOptions } from './options';

/* El único dueño de las URLs de un listado. Segmentos fijos, iguales en todos los idiomas:

     /<carpeta>/                        tamaño por defecto, página 1
     /<carpeta>/page/2/                 tamaño por defecto, página 2
     /<carpeta>/per-page/24/            tamaño 24, página 1
     /<carpeta>/per-page/24/page/2/     tamaño 24, página 2

   La carpeta es la URL del listado en su idioma (el `slug` de su `_index.<idioma>.md`, si lo tiene). */

export const PAGE_SEGMENT = 'page';
export const PER_PAGE_SEGMENT = 'per-page';

/** Una página de un listado: con cuántas entradas por página y cuál. */
export interface ListingPosition {
  perPage: number;
  page: number;
}

/** `<urlSlug>[/per-page/<n>][/page/<n>]` sin idioma ni base; el tamaño por defecto y la página 1 no llevan segmento. */
export function listingPageSlug(
  urlSlug: string,
  at: ListingPosition,
  defaultPerPage: number,
): string {
  return [
    urlSlug,
    ...(at.perPage === defaultPerPage ? [] : [PER_PAGE_SEGMENT, String(at.perPage)]),
    ...(at.page === 1 ? [] : [PAGE_SEGMENT, String(at.page)]),
  ]
    .filter(Boolean)
    .join('/');
}

/** URL (con base, idioma y barra final) de una página de un listado. */
export function listingPageUrl(
  urlSlug: string,
  locale: Locale,
  at: ListingPosition,
  defaultPerPage: number,
  url: UrlPolicy,
): string {
  return pageUrl(listingPageSlug(urlSlug, at, defaultPerPage), locale, url);
}

/** Todas las posiciones de un listado: cada tamaño de `perPageOptions` × cada una de sus páginas. */
export function listingPositions(total: number, options: PagedListingOptions): ListingPosition[] {
  return options.perPageOptions.flatMap((perPage) =>
    Array.from({ length: pageCount(total, perPage) }, (_item, index) => ({
      perPage,
      page: index + 1,
    })),
  );
}

/** ¿Cae `slug` en un segmento reservado de la carpeta `folder` (o debajo)? */
function isReserved(slug: string, folder: string): boolean {
  return [PAGE_SEGMENT, PER_PAGE_SEGMENT].some((segment) => {
    const reserved = [folder, segment].filter(Boolean).join('/');
    return slug === reserved || slug.startsWith(`${reserved}/`);
  });
}

/** Un error por cada página cuya URL cae en `<carpeta>/page` o `<carpeta>/per-page` (o debajo) de un listado de su idioma. */
export function reservedSegmentErrors(pages: readonly Page[]): DocsError[] {
  const listings = pages.filter(listsFolder);
  return pages.flatMap((page) => {
    const slug = urlSlugOf(page);
    const listing = listings.find(
      (candidate) => candidate.locale === page.locale && isReserved(slug, urlSlugOf(candidate)),
    );
    if (!listing) return [];
    const folder = urlSlugOf(listing) || '(portada)';
    return [
      new DocsError(
        `La URL «${slug}» (${page.locale}) de «${page.sourcePath}» está reservada: «${PAGE_SEGMENT}» y «${PER_PAGE_SEGMENT}» son de la paginación del listado de «${folder}».`,
        {
          file: page.sourcePath,
          hint: 'Renombra el archivo o cambia su `slug`: dentro de una carpeta con listado, `page` y `per-page` son de la paginación.',
        },
      ),
    ];
  });
}
