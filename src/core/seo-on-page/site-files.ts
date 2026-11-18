import { pageUrl, type UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { privacyPageUrls } from '../privacy/pages';
import { DEFAULT_FAVICON_PATH, isLocalFavicon, resolveFavicon } from '../seo/favicon';
import { withBase } from '../shared/urls';

/** Los archivos de sitio que el panel enseña, en este orden. */
export type SiteFileId =
  'sitemap' | 'robots' | 'llms' | 'not-found' | 'favicon' | 'privacy' | 'pagefind';

/**
 * Quién pone el archivo: la librería lo genera, el consumidor lo tiene en `public/`, no existe
 * (sin más: no es un problema), no aplica con esta config o solo aparece tras la build.
 */
export type SiteFileState = 'generated' | 'present' | 'absent' | 'not-applicable' | 'build-only';

export interface SiteFile {
  id: SiteFileId;
  /** Ruta tal como se muestra, sin `base`. */
  path: string;
  state: SiteFileState;
  /** Enlace para abrirlo en desarrollo (con `base`); sin él, no se puede abrir. */
  href?: string;
  /** Una entrada por idioma, cuando el archivo se genera por idioma (la 404, la privacidad). */
  links?: { locale: Locale; href: string }[];
  /** Solo el sitemap: URLs que lleva. */
  urls?: number;
}

/** Hechos que el adaptador reúne (config y disco); aquí solo se interpretan. */
export interface SiteFilesFacts {
  url: UrlPolicy;
  locales: readonly Locale[];
  sitemapUrls: number;
  /** `public/robots.txt` existe. */
  robots: boolean;
  /** `public/llms.txt` existe. */
  llms: boolean;
  /** La config pide la página de privacidad propia (`privacy.page`). */
  privacyPage: boolean;
  /** El `favicon` de la config; sin él se usa el del paquete. */
  favicon?: string;
}

/** Archivo que el consumidor puede tener en `public/`: ausente es un estado, no una incidencia. */
function publicFile(id: 'robots' | 'llms', url: UrlPolicy, exists: boolean): SiteFile {
  const path = `/${id}.txt`;
  return exists
    ? { id, path, state: 'present', href: withBase(url.base, path) }
    : { id, path, state: 'absent' };
}

/** Archivo generado por idioma: `href` es el del idioma por defecto. */
function perLocale(
  id: 'not-found' | 'privacy',
  path: string,
  links: NonNullable<SiteFile['links']>,
  url: UrlPolicy,
): SiteFile {
  const main = links.find((link) => link.locale === url.defaultLocale) ?? links[0];
  return {
    id,
    path,
    state: 'generated',
    ...(main && { href: main.href }),
    links,
  };
}

/** Las entradas del panel «Archivos del sitio», ya decididas: la UI solo las pinta. */
export function siteFiles(facts: SiteFilesFacts): SiteFile[] {
  const { url, locales } = facts;
  const favicon = resolveFavicon(facts.favicon, url.base);
  const faviconPath =
    facts.favicon === undefined
      ? DEFAULT_FAVICON_PATH
      : isLocalFavicon(facts.favicon)
        ? `/${facts.favicon.replace(/^\/+/, '')}`
        : facts.favicon;
  const privacyUrls = facts.privacyPage ? privacyPageUrls(locales, url) : undefined;
  return [
    {
      id: 'sitemap',
      path: '/sitemap.xml',
      state: 'generated',
      href: withBase(url.base, '/sitemap.xml'),
      urls: facts.sitemapUrls,
    },
    publicFile('robots', url, facts.robots),
    publicFile('llms', url, facts.llms),
    perLocale(
      'not-found',
      '/404',
      locales.map((locale) => ({ locale, href: pageUrl('404', locale, url) })),
      url,
    ),
    {
      id: 'favicon',
      path: faviconPath,
      state: facts.favicon === undefined ? 'generated' : 'present',
      href: favicon.href,
    },
    privacyUrls
      ? perLocale(
          'privacy',
          '/privacy',
          locales.map((locale) => ({ locale, href: privacyUrls[locale]! })),
          url,
        )
      : { id: 'privacy', path: '/privacy', state: 'not-applicable' },
    { id: 'pagefind', path: '/pagefind/', state: 'build-only' },
  ];
}
