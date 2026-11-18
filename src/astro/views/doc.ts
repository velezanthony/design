import type { ResolvedLayout } from '../../core/config/layout';
import { pageUrl } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import { fallbackRoutes } from '../../core/i18n/translation-policy';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildFooter, type FooterView } from '../../core/navigation/footer';
import { buildNav, type NavEntry } from '../../core/navigation/nav-entries';
import { buildScopedSidebar } from '../../core/navigation/nav-sidebar';
import { flatten, type SidebarNode } from '../../core/navigation/sidebar';
import { prevNext } from '../../core/navigation/prev-next';
import { buildHead, type HeadConfig, type PageData } from '../../core/seo/head';
import { excludeNoindex, noindexUrls } from '../../core/seo/indexable';
import { resolveMeta, withImageSize, type ImageSizes } from '../../core/seo/meta';
import type { DocData } from '../loader/schema';
import { consentOf, navContextOf, siteContext } from './chrome';
import type { VirtualConfig } from '../virtual/data';
import { baseUrl } from '../../core/shared/urls';

/** Una ruta que sirve `doc.astro`: una página real o una ruta de reserva (`fallback`). */
export interface DocRoute {
  /** Valor de `[...slug]`: sin base; el idioma por defecto va sin prefijo; la portada es `undefined`. */
  param: string | undefined;
  kind: 'page' | 'fallback';
  slug: string;
  /** Idioma de la ruta (`<html lang>`, barra lateral, textos). */
  locale: Locale;
  /** Idioma del contenido que se pinta: el de la ruta salvo en las de reserva. */
  contentLocale: Locale;
  /** Solo en `fallback`: URL (con base) del original. */
  canonical?: string;
}

function paramOf(slug: string, locale: Locale, defaultLocale: Locale) {
  return [locale === defaultLocale ? '' : locale, slug].filter(Boolean).join('/') || undefined;
}

/** Todas las rutas del sitio: las páginas reales y, con política `fallback`, las de reserva. */
export function docRoutes(data: DocData[], config: VirtualConfig): DocRoute[] {
  const { pages, url, availability, policies } = siteContext(config, data);
  const real = pages.map((page): DocRoute => ({
    param: paramOf(page.slug, page.locale, config.defaultLocale),
    kind: 'page',
    slug: page.slug,
    locale: page.locale,
    contentLocale: page.locale,
  }));
  const fallback = fallbackRoutes(availability, policies, config, url).map((spec): DocRoute => ({
    param: paramOf(spec.slug, spec.locale, config.defaultLocale),
    kind: 'fallback',
    slug: spec.slug,
    locale: spec.locale,
    contentLocale: spec.entryMeta.locale,
    canonical: spec.canonical,
  }));
  return [...real, ...fallback];
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
  config: VirtualConfig;
  data: DocData[];
  sizes?: ImageSizes;
}

/** Datos de la página que se renderiza, para el layout. */
export function docView({ route, config, data, sizes = new Map() }: DocViewInput): DocView {
  const site = siteContext(config, data);
  const { pages, url, availability } = site;
  const original = data.find(
    (item) => item.slug === route.slug && item.locale === route.contentLocale,
  );
  if (!original) throw new Error(`No hay entrada ${route.contentLocale}/${route.slug}.`);

  const isFallback = route.kind === 'fallback';
  const meta = withImageSize(
    resolveMeta(config.seo, original.seo, { title: original.title }, route.locale),
    sizes,
  );
  const pageUrlOfRoute = pageUrl(route.slug, route.locale, url);
  const pageData: PageData = {
    kind: route.kind,
    slug: route.slug,
    locale: route.locale,
    url: pageUrlOfRoute,
    ...(route.canonical !== undefined && { canonical: route.canonical }),
  };
  const head = buildHead(
    meta,
    pageData,
    excludeNoindex(availability, noindexUrls(pages, url)),
    new URL(config.site),
    config,
    url,
  );

  const navContext = navContextOf(site, route.locale, route.slug);
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
    strings: config.strings[route.locale] as UiStrings,
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
