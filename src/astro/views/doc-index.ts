import { IndexLayout, listingOptions, type ListingOptions } from '../../core/config/indexes';
import { pageUrl, type UrlPolicy } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import { translate, type UiStrings } from '../../core/i18n/ui-strings';
import {
  buildIndexListing,
  coverFor,
  pageCount,
  pageSlice,
  sortByUpdated,
  PAGE_PARAM,
  PER_PAGE_PARAM,
  type EntryDetails,
  type IndexItem,
  type IndexListing,
  type IndexView,
} from '../../core/navigation/index-entries';
import type { DocData } from '../loader/schema';
import type { VirtualConfig } from '../virtual/data';
import { navContextOf, siteContext, type SiteContext } from './chrome';

/* El índice generado de una página con listado (un `_index.md` o una carpeta que `indexes` activa):
   qué rutas tiene (la tabla y las tarjetas se paginan) y lo que pinta cada una. Las portadas salen
   como `EntryCover`; la ruta convierte las imágenes en URLs con `astro:assets`. */

/** Lo que el índice necesita saber de la ruta que se pinta. */
interface ListingRoute {
  /** Identidad de la página del listado: su carpeta. */
  slug: string;
  /** URL del listado sin idioma ni base, si no es la de su identidad (un `_index.en.md` con `slug`). */
  urlSlug?: string;
  locale: Locale;
  contentLocale: Locale;
  /** Página del listado (desde 2); sin ella, la 1. */
  page?: number;
}

/** La página que pone el contenido de la ruta. */
function contentOf(route: Pick<ListingRoute, 'slug' | 'contentLocale'>, data: DocData[]) {
  return data.find((item) => item.slug === route.slug && item.locale === route.contentLocale);
}

/** Opciones del listado de la ruta, o `undefined` si su página no lleva. */
export function listingFor(
  route: Pick<ListingRoute, 'slug' | 'contentLocale'>,
  config: Pick<VirtualConfig, 'indexes'>,
  data: DocData[],
): ListingOptions | undefined {
  const page = contentOf(route, data);
  return page && listingOptions(page, config.indexes);
}

/** ¿Se pagina esta disposición? La lista no: es el árbol entero. */
function paginated(layout: IndexLayout): boolean {
  return layout !== IndexLayout.LIST;
}

/** URLs de las páginas de un tamaño que no es el de las rutas estáticas: la carpeta con la query. */
export function sizeHrefs(folderHref: string, perPage: number, pages: number): string[] {
  return Array.from({ length: pages }, (_item, index) => {
    const page = index + 1;
    const query = `${PER_PAGE_PARAM}=${perPage}${page === 1 ? '' : `&${PAGE_PARAM}=${page}`}`;
    return `${folderHref}?${query}`;
  });
}

/** URL de la página `page` del listado de `slug`: la 1 es la de la carpeta; las demás, `<carpeta>/<n>/`. */
export function listingPageUrl(slug: string, locale: Locale, page: number, url: UrlPolicy): string {
  return pageUrl(page === 1 ? slug : [slug, String(page)].filter(Boolean).join('/'), locale, url);
}

/** La portada y la fecha de cada página, de su entrada en el idioma del contenido (o del original). */
function detailsOf(data: DocData[], locale: Locale, defaultLocale: Locale, dates: DatesBySource) {
  return (slug: string): EntryDetails | undefined => {
    const item =
      data.find((entry) => entry.slug === slug && entry.locale === locale) ??
      data.find((entry) => entry.slug === slug && entry.locale === defaultLocale) ??
      data.find((entry) => entry.slug === slug);
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

function listingOf(
  site: SiteContext,
  route: ListingRoute,
  options: ListingOptions,
  data: DocData[],
  dates: DatesBySource = new Map(),
  takenIds: Iterable<string> = [],
): IndexListing {
  return buildIndexListing(
    navContextOf(site, route.locale, route.slug, route.urlSlug),
    route.contentLocale,
    options.folder,
    detailsOf(data, route.contentLocale, site.config.defaultLocale, dates),
    takenIds,
  );
}

/** Páginas del listado de una ruta, o `undefined` si no se pagina (no tiene listado o es una lista). */
export function listingPages(
  site: SiteContext,
  route: Omit<ListingRoute, 'page'>,
  data: DocData[],
): number | undefined {
  const options = listingFor(route, site.config, data);
  if (!options || !paginated(options.layout)) return undefined;
  return pageCount(listingOf(site, route, options, data).entries.length, options.pageSize);
}

interface IndexViewInput {
  route: ListingRoute;
  config: VirtualConfig;
  data: DocData[];
  dates?: DatesBySource;
  /** Encabezados del cuerpo de la página: sus ids no se repiten en el listado. */
  headings?: { depth: number; slug: string; text: string }[];
}

/** El índice de la ruta, o `undefined` si su página no lleva listado. */
export function docIndexView({
  route,
  config,
  data,
  dates,
  headings = [],
}: IndexViewInput): IndexView | undefined {
  const options = listingFor(route, config, data);
  if (!options) return undefined;
  const site = siteContext(config, data);
  const listing = listingOf(
    site,
    route,
    options,
    data,
    dates,
    headings.map((heading) => heading.slug),
  );
  const strings = config.strings[route.locale] as UiStrings;
  const isPaginated = paginated(options.layout);
  const pages = isPaginated ? pageCount(listing.entries.length, options.pageSize) : 1;
  const page = route.page ?? 1;
  const sorted = isPaginated ? sortByUpdated(listing.entries) : [];
  /* La página 1 trae todas las entradas (las de más, ocultas) para que el selector no necesite red. */
  const all = isPaginated && page === 1;
  const items = (all ? sorted : pageSlice(sorted, page, options.pageSize)).map(
    ({ cover, imageAlt, ...entry }): IndexItem => ({
      ...entry,
      cover: coverFor(cover, options.image, imageAlt),
    }),
  );
  const title = contentOf(route, data)?.title ?? '';
  const hrefs = Array.from({ length: pages }, (_item, index) =>
    listingPageUrl(route.urlSlug ?? route.slug, route.locale, index + 1, site.url),
  );
  const sections = isPaginated ? [] : listing.sections;
  return {
    layout: options.layout,
    sections,
    items,
    page,
    pages,
    total: listing.entries.length,
    hrefs,
    all,
    perPage: options.pageSize,
    perPageOptions: options.perPageOptions,
    sizes: all
      ? options.perPageOptions.map((perPage) => {
          const count = pageCount(listing.entries.length, perPage);
          return {
            perPage,
            pages: count,
            hrefs: perPage === options.pageSize ? hrefs : sizeHrefs(hrefs[0]!, perPage, count),
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
        page: translate(strings, 'index.pageOf', { page: String(page), pages: String(pages) }),
      },
    }),
  };
}
