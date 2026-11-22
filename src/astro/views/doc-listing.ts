import type { Locale } from '../../core/i18n/locale';
import { pickLocalized } from '../../core/i18n/translation-policy';
import { translate, type UiStrings } from '../../core/i18n/ui-strings';
import { coverFor } from '../../core/listing/covers';
import { listingPageUrl } from '../../core/listing/urls';
import type { Page } from '../../core/content/discovery';
import { isPagedListing, resolveListing, type ListingOptions } from '../../core/listing/options';
import {
  buildListing,
  sortByUpdated,
  type EntryDetails,
  type Listing,
} from '../../core/listing/entries';
import {
  PAGE_PARAM,
  PER_PAGE_PARAM,
  type IndexItem,
  type IndexView,
} from '../../core/listing/view';
import { pageCount, paginate } from '../../core/shared/paginate';
import type { DocData } from '../loader/schema';
import type { VirtualConfig } from '../virtual/data';
import { navContextOf, type SiteContext } from './chrome';
import type { DocRoute } from './doc';

/* El índice generado de una página con listado (un `_index.md` o una carpeta que `indexes` activa):
   sus opciones (que `docRoutes` resuelve una vez por ruta), cuántas páginas tiene y lo que pinta cada
   una. Las portadas salen como `EntryCover`; la ruta convierte las imágenes en URLs con
   `astro:assets`. */

/** Opciones del listado de una página, o `undefined` si no lista su carpeta. */
export function listingOptionsOf(
  page: Pick<Page, 'slug' | 'listing'>,
  config: Pick<VirtualConfig, 'indexes'>,
): ListingOptions | undefined {
  if (!page.listing) return undefined;
  return resolveListing({ folder: page.slug, own: page.listing, indexes: config.indexes });
}

/** URLs de las páginas de un tamaño que no es el de las rutas estáticas: la carpeta con la query. */
export function sizeHrefs(folderHref: string, perPage: number, pages: number): string[] {
  return Array.from({ length: pages }, (_item, index) => {
    const page = index + 1;
    const query = `${PER_PAGE_PARAM}=${perPage}${page === 1 ? '' : `&${PAGE_PARAM}=${page}`}`;
    return `${folderHref}?${query}`;
  });
}

/** La portada y la fecha de cada página, de su entrada en el idioma del contenido o, sin ella, la del original (`pickLocalized`). */
function detailsOf(
  data: DocData[],
  locale: Locale,
  config: Pick<VirtualConfig, 'locales' | 'defaultLocale'>,
  dates: DatesBySource,
) {
  return (slug: string): EntryDetails | undefined => {
    const item = pickLocalized(data, slug, locale, config);
    if (!item) return undefined;
    const updated = dates.get(item.sourcePath);
    const { cover, imageAlt } = item.index ?? {};
    return {
      ...(updated !== undefined && { updated }),
      ...(cover !== undefined && { cover }),
      ...(imageAlt !== undefined && { imageAlt }),
    };
  };
}

/** Fecha del último commit de cada archivo, por `sourcePath`; lo que no tiene commit no figura. */
export type DatesBySource = ReadonlyMap<string, string>;

/** Lo que el listado necesita saber de la ruta que se pinta. */
type RouteFields = Pick<DocRoute, 'slug' | 'urlSlug' | 'locale' | 'contentLocale'>;

function listingOf(
  site: SiteContext,
  route: RouteFields,
  options: ListingOptions,
  details: (slug: string) => EntryDetails | undefined,
  takenIds: Iterable<string> = [],
): Listing {
  return buildListing({
    context: navContextOf(site, route),
    contentLocale: route.contentLocale,
    folder: options.folder,
    details,
    takenIds,
  });
}

/** Páginas de un listado paginado; solo cuenta entradas, sin fechas ni portadas. */
export function listingPageCount(
  site: SiteContext,
  route: RouteFields,
  options: ListingOptions,
): number {
  if (!isPagedListing(options)) return 1;
  const total = listingOf(site, route, options, () => undefined).entries.length;
  return pageCount(total, options.pageSize);
}

interface ListingViewInput {
  route: DocRoute;
  site: SiteContext;
  data: DocData[];
  dates?: DatesBySource;
  /** Encabezados del cuerpo de la página: sus ids no se repiten en el listado. */
  headings?: { depth: number; slug: string; text: string }[];
}

/** El índice de la ruta, o `undefined` si su página no lleva listado. */
export function docListingView({
  route,
  site,
  data,
  dates = new Map(),
  headings = [],
}: ListingViewInput): IndexView | undefined {
  const options = route.listing;
  if (!options) return undefined;
  const listing = listingOf(
    site,
    route,
    options,
    detailsOf(data, route.contentLocale, site.config, dates),
    headings.map((heading) => heading.slug),
  );
  const strings = site.config.strings[route.locale] as UiStrings;
  const paged = isPagedListing(options) ? options : undefined;
  const total = listing.entries.length;
  /* La lista no se pagina: todo cabe en su única página. */
  const perPage = paged?.pageSize ?? total;
  const perPageOptions = paged?.perPageOptions ?? [];
  const pages = paged ? pageCount(total, paged.pageSize) : 1;
  const page = route.page ?? 1;
  const sorted = paged ? sortByUpdated(listing.entries) : [];
  /* La página 1 trae todas las entradas (las de más, ocultas) para que el selector no necesite red. */
  const all = paged !== undefined && page === 1;
  const items = (all ? sorted : paginate(sorted, page, perPage).rows).map(
    ({ cover, imageAlt, ...entry }): IndexItem => ({
      ...entry,
      cover: coverFor(cover, options.covers, imageAlt),
    }),
  );
  const title =
    data.find((item) => item.slug === route.slug && item.locale === route.contentLocale)?.title ??
    '';
  const hrefs = Array.from({ length: pages }, (_item, index) =>
    listingPageUrl(route.urlSlug, route.locale, { perPage, page: index + 1 }, perPage, site.url),
  );
  const sections = paged ? [] : listing.sections;
  return {
    layout: options.layout,
    sections,
    items,
    page,
    pages,
    total,
    hrefs,
    all,
    perPage,
    perPageOptions,
    sizes: all
      ? perPageOptions.map((size) => {
          const count = pageCount(total, size);
          return {
            perPage: size,
            pages: count,
            hrefs: size === perPage ? hrefs : sizeHrefs(hrefs[0]!, size, count),
          };
        })
      : [],
    headings: sections.flatMap((section) =>
      section.id === undefined || section.label === undefined
        ? []
        : [{ depth: 2, slug: section.id, text: section.label }],
    ),
    ...(page > 1 && {
      heading: {
        title,
        page: translate(strings, 'listing.pageOf', { page: String(page), pages: String(pages) }),
      },
    }),
  };
}
