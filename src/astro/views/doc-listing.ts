import { listsFolder } from '../../core/content/generated-listings';
import type { Locale } from '../../core/i18n/locale';
import { pickLocalized } from '../../core/i18n/translation-policy';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildListing, type EntryDetails, type Listing } from '../../core/listing/entries';
import { isPagedListing, resolveListing, type ListingOptions } from '../../core/listing/options';
import { listingPageUrl } from '../../core/listing/urls';
import { buildListingView, type ListingHrefs, type ListingView } from '../../core/listing/view';
import type { DocData } from '../loader/schema';
import { navContextOf, type SiteContext } from './chrome';
import type { DocRoute } from './doc';
import type { ConfigPick } from '../../core/config/resolve';

/* El índice generado de una página con listado (un `_index.md` o una carpeta que `folders` activa):
   sus opciones (que `docRoutes` resuelve una vez por ruta), cuántas entradas tiene y su modelo de
   vista, que construye `core/listing/view.ts`; aquí se ensambla y se implementa el puerto de URLs.
   Las portadas salen como `EntryCover`; la ruta convierte las imágenes en URLs con `astro:assets`. */

/** Opciones del listado de una página, o `undefined` si no lista su carpeta. */
export function listingOptionsOf(
  page: Pick<DocData, 'slug' | 'kind' | 'sourcePath'>,
  config: ConfigPick<never, never, 'folders'>,
): ListingOptions | undefined {
  if (!listsFolder(page)) return undefined;
  return resolveListing({ folder: page.slug, folders: config.content.folders });
}

/** La portada y la fecha de cada página, de su entrada en el idioma del contenido o, sin ella, la del original (`pickLocalized`). */
function detailsOf(
  data: DocData[],
  locale: Locale,
  config: ConfigPick<never, 'locales' | 'defaultLocale'>,
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

/** Entradas de un listado; solo las cuenta, sin fechas ni portadas. */
export function listingEntryCount(
  site: SiteContext,
  route: RouteFields,
  options: ListingOptions,
): number {
  return listingOf(site, route, options, () => undefined).entries.length;
}

/** Las URLs del listado de la ruta: su carpeta en su idioma, con la base y la barra final del sitio. */
function hrefsOf(route: RouteFields, options: ListingOptions, site: SiteContext): ListingHrefs {
  const defaultPerPage = isPagedListing(options) ? options.pageSize : 1;
  return {
    at: (position) =>
      listingPageUrl(route.urlSlug, route.locale, position, defaultPerPage, site.url),
  };
}

interface ListingViewInput {
  route: DocRoute;
  site: SiteContext;
  data: DocData[];
  dates?: DatesBySource;
  /** Encabezados del cuerpo de la página: sus ids no se repiten en el listado. */
  headings?: { depth: number; slug: string; text: string }[];
}

/** El modelo de vista del listado de la ruta, o `undefined` si su página no lleva listado. */
export function docListingView({
  route,
  site,
  data,
  dates = new Map(),
  headings = [],
}: ListingViewInput): ListingView | undefined {
  const options = route.listing;
  if (!options) return undefined;
  const listing = listingOf(
    site,
    route,
    options,
    detailsOf(data, route.contentLocale, site.config, dates),
    headings.map((heading) => heading.slug),
  );
  const title =
    data.find((item) => item.slug === route.slug && item.locale === route.contentLocale)?.title ??
    '';
  const position = route.listingPosition;
  return buildListingView(
    {
      listing,
      options,
      ...(position && { position: { perPage: position.perPage, page: position.page } }),
      locale: route.locale,
      strings: site.config.strings[route.locale] as UiStrings,
      title,
    },
    hrefsOf(route, options, site),
  );
}
