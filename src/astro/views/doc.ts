import type { ResolvedLayout } from '../../core/config/layout';
import { localePrefix, pageUrl } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import { fallbackRoutes } from '../../core/i18n/translation-policy';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildFooter, type FooterView } from '../../core/navigation/footer';
import { buildNav, type NavEntry } from '../../core/navigation/nav-entries';
import { buildScopedSidebar } from '../../core/navigation/nav-sidebar';
import { buildNavTrees, type NavTreeNode } from '../../core/navigation/nav-tree';
import { flatten, type SidebarNode } from '../../core/navigation/sidebar';
import { prevNext } from '../../core/navigation/prev-next';
import { buildHead, type HeadConfig, type PageData } from '../../core/seo/head';
import { excludeNoindex, noindexUrls } from '../../core/seo/indexable';
import { resolveMeta, withImageSize, type ImageSizes } from '../../core/seo/meta';
import type { DocData } from '../loader/schema';
import { consentOf, navContextOf, type SiteContext } from './chrome';
import { baseUrl } from '../../core/shared/urls';
import { DocsError } from '../../core/errors';
import { urlSlugOf } from '../../core/content/slug';
import { translate } from '../../core/i18n/ui-strings';
import type { ListingOptions } from '../../core/listing/options';
import { isPagedListing } from '../../core/listing/options';
import {
  listingPageSlug,
  listingPageUrl,
  listingPositions,
  type ListingPosition,
} from '../../core/listing/urls';
import { listingEntryCount, listingOptionsOf } from './doc-listing';

/** Una ruta que sirve `doc.astro`: una página real o una ruta de reserva (`fallback`). */
export interface DocRoute {
  /** Valor de `[...slug]`: sin base; el idioma por defecto va sin prefijo; la portada es `undefined`. */
  param: string | undefined;
  kind: 'page' | 'fallback';
  /** Identidad de la página (su archivo sin sufijo de idioma): con ella se buscan el contenido y la sección. */
  slug: string;
  /** URL de la ruta sin idioma ni base: el `slug` propio de la página o, en una reserva, el del original. */
  urlSlug: string;
  /** Idioma de la ruta (`<html lang>`, barra lateral, textos). */
  locale: Locale;
  /** Idioma del contenido que se pinta: el de la ruta salvo en las de reserva. */
  contentLocale: Locale;
  /** Solo en `fallback`: URL (con base) del original. */
  canonical?: string;
  /** Opciones del listado de su página, ya resueltas; solo en las rutas de una página con listado. */
  listing?: ListingOptions;
  /** Solo en un listado paginado: el tamaño y la página que sirve esta ruta, y cuántas tiene ese tamaño. */
  listingPosition?: ListingPosition & { pages: number };
}

function paramOf(slug: string, locale: Locale, defaultLocale: Locale) {
  return [localePrefix(locale, defaultLocale), slug].filter(Boolean).join('/') || undefined;
}

/** Todas las rutas del sitio: las páginas reales y, con política `fallback`, las de reserva. */
export function docRoutes(site: SiteContext): DocRoute[] {
  const { pages, url, availability, policies, config } = site;
  const real = pages.map((page): DocRoute => ({
    param: paramOf(urlSlugOf(page), page.locale, config.defaultLocale),
    kind: 'page',
    slug: page.slug,
    urlSlug: urlSlugOf(page),
    locale: page.locale,
    contentLocale: page.locale,
  }));
  const fallback = fallbackRoutes({ availability, policies, config, url, pages }).map(
    (spec): DocRoute => ({
      param: paramOf(spec.urlSlug, spec.locale, config.defaultLocale),
      kind: 'fallback',
      slug: spec.slug,
      urlSlug: spec.urlSlug,
      locale: spec.locale,
      contentLocale: spec.entryMeta.locale,
      canonical: spec.canonical,
    }),
  );
  assertFreeFallbacks(real, fallback, site);
  return withListingPages(withListings([...real, ...fallback], site), site);
}

/** Cada ruta con las opciones del listado de la página que pinta, si lista su carpeta. */
function withListings(routes: DocRoute[], site: SiteContext): DocRoute[] {
  return routes.map((route) => {
    const page = site.pages.find(
      (item) => item.slug === route.slug && item.locale === route.contentLocale,
    );
    const listing = page && listingOptionsOf(page, site.config);
    return listing ? { ...route, listing } : route;
  });
}

/** Una reserva va en la URL del original con el prefijo de su idioma; si un `slug` propio ya la ocupa en ese idioma, la build se para. */
function assertFreeFallbacks(real: DocRoute[], fallback: DocRoute[], site: SiteContext): void {
  const owners = new Map(real.map((route) => [route.param, route]));
  for (const route of fallback) {
    const owner = owners.get(route.param);
    if (!owner) continue;
    const file =
      site.pages.find((item) => item.slug === owner.slug && item.locale === owner.locale)
        ?.sourcePath ?? owner.slug;
    const original = site.pages.find(
      (item) => item.slug === route.slug && item.locale === route.contentLocale,
    )?.sourcePath;
    throw new DocsError(
      `La ruta de reserva ${pageUrl(route.urlSlug, route.locale, site.url)} de «${original ?? route.slug}» (sin traducción a ${route.locale}) coincide con la URL de «${file}».`,
      {
        file,
        hint: `Cambia el \`slug\` de «${file}», traduce la página o declara \`translations: link\` u \`omit\` en ella para que no tenga reserva.`,
      },
    );
  }
}

/** Una ruta por posición de cada listado paginado: cada tamaño de `perPageOptions` × cada una de sus páginas (`<carpeta>/page/2/`, `<carpeta>/per-page/24/`…). Una página real en una de esas URLs rompe el build (segunda red: el loader ya rechaza los nombres reservados). */
function withListingPages(routes: DocRoute[], site: SiteContext): DocRoute[] {
  const taken = new Set(routes.map((route) => route.param));
  return routes.flatMap((route) => {
    const listing = route.listing && isPagedListing(route.listing) ? route.listing : undefined;
    if (!listing) return [route];
    const positions = listingPositions(listingEntryCount(site, route, listing), listing);
    return positions.map((position): DocRoute => {
      const pages = positions.filter((other) => other.perPage === position.perPage).length;
      const listingPosition = { ...position, pages };
      const first = position.perPage === listing.pageSize && position.page === 1;
      if (first) return { ...route, listingPosition };
      const param = paramOf(
        listingPageSlug(route.urlSlug, position, listing.pageSize),
        route.locale,
        site.config.defaultLocale,
      );
      if (taken.has(param)) {
        throw new DocsError(
          `La URL /${param}/ del listado de «${route.slug || '(portada)'}» coincide con una página real.`,
          {
            hint: 'Renombra esa página o cambia su `slug`: `page` y `per-page` son de la paginación del listado.',
          },
        );
      }
      return {
        ...route,
        param,
        listingPosition,
        ...(route.kind === 'fallback' && {
          canonical: positionUrl(route, route.contentLocale, position, site.url),
        }),
      };
    });
  });
}

/** URL de una posición del listado de la ruta (sin listado paginado, la de la ruta). */
function positionUrl(
  route: DocRoute,
  locale: Locale,
  position: ListingPosition | undefined,
  url: Parameters<typeof pageUrl>[2],
): string {
  const listing = route.listing && isPagedListing(route.listing) ? route.listing : undefined;
  if (!listing || !position) return pageUrl(route.urlSlug, locale, url);
  return listingPageUrl(route.urlSlug, locale, position, listing.pageSize, url);
}

/** Todo lo que `DocsLayout` necesita, ya calculado por el núcleo: el contenedor solo lo pasa. */
export interface DocView {
  lang: Locale;
  head: HeadConfig[];
  siteName: string;
  homeHref: string;
  hrefs: Partial<Record<Locale, string>>;
  strings: UiStrings;
  sidebar: SidebarNode[];
  /** Items de la cabecera (vacío sin `nav`). */
  nav: NavEntry[];
  /** Licencia, autor y enlaces del footer, ya resueltos para el idioma de la página. */
  footer: FooterView;
  current: string;
  prev?: { label: string; href: string };
  next?: { label: string; href: string };
  editUrl?: string;
  editFile?: string;
  privacyUrl?: string;
  gtmId?: string;
  indexable: boolean;
  baseUrl: string;
  fallback?: { originalLocale: Locale; href: string };
  layout: ResolvedLayout;
}

interface DocViewInput {
  route: DocRoute;
  /** El contexto del sitio, construido una vez por render en la ruta. */
  site: SiteContext;
  /** Los datos de la colección: de la entrada del contenido salen `editPath`, el `seo` y el título. */
  data: DocData[];
  sizes?: ImageSizes;
}

/** Datos de la página que se renderiza, para el layout. */
export function docView({ route, site, data, sizes = new Map() }: DocViewInput): DocView {
  const { pages, url, availability, config } = site;
  const original = data.find(
    (item) => item.slug === route.slug && item.locale === route.contentLocale,
  );
  if (!original) throw new Error(`No hay entrada ${route.contentLocale}/${route.slug}.`);

  const isFallback = route.kind === 'fallback';
  const strings = config.strings[route.locale] as UiStrings;
  const position = route.listingPosition;
  const page = position?.page ?? 1;
  /* Fuera de la página 1 del tamaño por defecto: `noindex`, canónica de sí misma. */
  const secondary =
    position !== undefined &&
    route.listing !== undefined &&
    isPagedListing(route.listing) &&
    (page > 1 || position.perPage !== route.listing.pageSize);
  const resolved = withImageSize(
    resolveMeta(config.seo, original.seo, { title: original.title }, route.locale),
    sizes,
  );
  /* Desde la página 2 de un listado, su propio título; fuera de la página 1 del tamaño por defecto, fuera del índice. */
  const titled =
    page > 1
      ? {
          ...resolved,
          title: `${resolved.title} · ${translate(strings, 'listing.pageOf', { page: String(page), pages: String(position?.pages ?? page) })}`,
        }
      : resolved;
  const meta = secondary ? { ...titled, noindex: true } : titled;
  const pageUrlOfRoute = pageUrl(route.urlSlug, route.locale, url);
  const pageData: PageData = {
    kind: route.kind,
    slug: route.slug,
    locale: route.locale,
    url: positionUrl(route, route.locale, position, url),
    ...(route.canonical !== undefined && { canonical: route.canonical }),
  };
  const head = [
    ...buildHead(
      meta,
      pageData,
      excludeNoindex(availability, noindexUrls(pages, url)),
      new URL(config.site),
      config,
      url,
    ),
    ...paginationLinks(route, url, new URL(config.site)),
  ];

  const navContext = navContextOf(site, route);
  const sidebar = buildScopedSidebar(navContext);
  const neighbours = prevNext(flatten(sidebar), route.slug);
  function link(leaf?: { label: string; href: string }) {
    return leaf && { label: leaf.label, href: leaf.href };
  }
  const editable = config.editUrl !== undefined && original.editPath !== undefined;
  const { prev, next } = { prev: link(neighbours.prev), next: link(neighbours.next) };

  return {
    lang: route.locale,
    head,
    siteName: config.name,
    homeHref: pageUrl('', route.locale, url),
    hrefs: availability.get(route.slug) ?? {},
    strings,
    sidebar,
    nav: buildNav(config.nav, navContext),
    footer: buildFooter(config, navContext, config.strings[route.locale] as UiStrings),
    current: pageUrlOfRoute,
    ...(prev && { prev }),
    ...(next && { next }),
    ...(editable && { editUrl: config.editUrl, editFile: original.editPath }),
    ...consentOf(config, route.locale),
    indexable: !isFallback && !meta.noindex,
    baseUrl: baseUrl(config.base),
    layout: config.layout,
    ...(isFallback && {
      fallback: { originalLocale: route.contentLocale, href: route.canonical ?? '' },
    }),
  };
}

/** `<link rel="prev|next">` entre las páginas de un listado paginado, sin salir de su tamaño. */
function paginationLinks(
  route: DocRoute,
  url: Parameters<typeof pageUrl>[2],
  site: URL,
): HeadConfig[] {
  const position = route.listingPosition;
  if (!position) return [];
  const links: HeadConfig[] = [];
  for (const [rel, target] of [
    ['prev', position.page - 1],
    ['next', position.page + 1],
  ] as const) {
    if (target < 1 || target > position.pages) continue;
    const at = { perPage: position.perPage, page: target };
    const href = new URL(positionUrl(route, route.locale, at, url), site).href;
    links.push({ tag: 'link', attrs: { rel, href } });
  }
  return links;
}

/** Los árboles de `::nav-tree` de la página, uno por posición de `nav`: textos en el idioma del contenido y URLs como las de su barra lateral. */
export function docNavTrees({
  route,
  site,
}: Pick<DocViewInput, 'route' | 'site'>): NavTreeNode[][] {
  return buildNavTrees(navContextOf(site, route), route.contentLocale);
}
