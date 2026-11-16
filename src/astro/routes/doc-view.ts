import { buildAvailability, pageUrl } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import { fallbackRoutes, resolvePolicies } from '../../core/i18n/translation-policy';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildSidebar, flatten, type SidebarNode } from '../../core/navigation/sidebar';
import { prevNext } from '../../core/navigation/prev-next';
import { buildHead, type HeadConfig, type PageData } from '../../core/seo/head';
import { excludeNoindex, noindexUrls } from '../../core/seo/indexable';
import { resolveMeta } from '../../core/seo/meta';
import { pagesOf, urlPolicyOf, type DocData } from './pages';
import type { VirtualConfig } from '../virtual/data';

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

const paramOf = (slug: string, locale: Locale, defaultLocale: Locale) =>
  [locale === defaultLocale ? '' : locale, slug].filter(Boolean).join('/') || undefined;

/** Todas las rutas del sitio: las páginas reales y, con política `fallback`, las de reserva. */
export function docRoutes(data: DocData[], cfg: VirtualConfig): DocRoute[] {
  const pages = pagesOf(data);
  const url = urlPolicyOf(cfg);
  const { policies } = resolvePolicies(pages, cfg.translations.missing);
  const real = pages.map((page): DocRoute => ({
    param: paramOf(page.slug, page.locale, cfg.defaultLocale),
    kind: 'page',
    slug: page.slug,
    locale: page.locale,
    contentLocale: page.locale,
  }));
  const fallback = fallbackRoutes(buildAvailability(pages, url), policies, cfg, url).map(
    (spec): DocRoute => ({
      param: paramOf(spec.slug, spec.locale, cfg.defaultLocale),
      kind: 'fallback',
      slug: spec.slug,
      locale: spec.locale,
      contentLocale: spec.entryMeta.locale,
      canonical: spec.canonical,
    }),
  );
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
}

/** Datos de la página que se renderiza, para el layout. */
export function docView(route: DocRoute, data: DocData[], cfg: VirtualConfig): DocView {
  const pages = pagesOf(data);
  const url = urlPolicyOf(cfg);
  const av = buildAvailability(pages, url);
  const { policies } = resolvePolicies(pages, cfg.translations.missing);
  const original = data.find(
    (item) => item.slug === route.slug && item.locale === route.contentLocale,
  );
  if (!original) throw new Error(`No hay entrada ${route.contentLocale}/${route.slug}.`);

  const isFallback = route.kind === 'fallback';
  const meta = resolveMeta(cfg.seo, original.seo, { title: original.title }, route.locale);
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
    excludeNoindex(av, noindexUrls(pages, url)),
    new URL(cfg.site),
    cfg,
    url,
  );

  const sidebar = buildSidebar(pages, av, route.locale, cfg, policies, url);
  const neighbours = prevNext(flatten(sidebar), route.slug);
  const link = (leaf?: { label: string; href: string }) =>
    leaf && { label: leaf.label, href: leaf.href };
  const editable = cfg.editUrl !== undefined && original.editPath !== undefined;
  const { prev, next } = { prev: link(neighbours.prev), next: link(neighbours.next) };

  return {
    lang: route.locale,
    head,
    siteName: cfg.name,
    homeHref: pageUrl('', route.locale, url),
    hrefs: av.get(route.slug) ?? {},
    strings: cfg.strings[route.locale] as UiStrings,
    sidebar,
    current: pageUrlOfRoute,
    ...(prev && { prev }),
    ...(next && { next }),
    ...(editable && { editUrl: cfg.editUrl, editFile: original.editPath }),
    ...(cfg.privacyUrl !== undefined && { privacyUrl: cfg.privacyUrl }),
    ...(cfg.gtmId !== undefined && { gtmId: cfg.gtmId }),
    indexable: !isFallback && !meta.noindex,
    baseUrl: `${cfg.base.replace(/\/+$/, '')}/`,
    ...(isFallback && {
      fallback: { originalLocale: route.contentLocale, href: route.canonical ?? '' },
    }),
  };
}
