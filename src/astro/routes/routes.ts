import { privacySlug } from '../../core/privacy/pages';
import { DEFAULT_FAVICON_PATH } from '../../core/seo/favicon';
import { SITEMAP_FILE, SITEMAP_PAGES, SITEMAP_STYLESHEET_PATH } from '../../core/seo/sitemap';

/** Carpeta común de las rutas del panel: lo que un consumidor no debería usar para sus páginas. */
export const SEO_ON_PAGE_DIR = 'seo-on-page';

/** Cuándo existe una ruta: siempre, solo en `astro dev` o según una opción de la config. */
type RouteWhen = 'site' | 'dev' | 'sitemapIndex' | 'multiLocale' | 'privacyPage' | 'privacyLocales';

interface Route {
  pattern: string;
  /** Su contenedor, relativo a esta carpeta. */
  file: string;
  when: RouteWhen;
  /** Un `src/pages/<ruta>/index.astro` del sitio también la sustituye. */
  folder?: true;
}

/** LA tabla de rutas que inyecta la integración, en el orden en que se inyectan. */
export const ROUTES: readonly Route[] = [
  { pattern: '/[...slug]', file: 'doc.astro', when: 'site' },
  { pattern: `/${SITEMAP_FILE}`, file: 'sitemap.xml.ts', when: 'site' },
  // Con otros sitemaps del dominio, `sitemap.xml` es su índice y las páginas propias van aparte.
  { pattern: `/${SITEMAP_PAGES}`, file: 'sitemap-pages.xml.ts', when: 'sitemapIndex' },
  { pattern: SITEMAP_STYLESHEET_PATH, file: 'sitemap.css.ts', when: 'site' },
  { pattern: DEFAULT_FAVICON_PATH, file: 'favicon.png.ts', when: 'site' },
  { pattern: '/404', file: 'not-found.astro', when: 'site' },
  { pattern: '/[privacy]', file: 'privacy.astro', when: 'privacyPage', folder: true },
  {
    pattern: '/[locale]/[privacy]',
    file: 'privacy-locale.astro',
    when: 'privacyLocales',
    folder: true,
  },
  // El panel lee la query de la URL: no se prerenderiza, y solo existe en dev.
  {
    pattern: `/${SEO_ON_PAGE_DIR}`,
    file: `${SEO_ON_PAGE_DIR}/overview.astro`,
    when: 'dev',
    folder: true,
  },
  {
    pattern: `/${SEO_ON_PAGE_DIR}/pages`,
    file: `${SEO_ON_PAGE_DIR}/pages.astro`,
    when: 'dev',
    folder: true,
  },
  {
    pattern: `/${SEO_ON_PAGE_DIR}/page`,
    file: `${SEO_ON_PAGE_DIR}/page.astro`,
    when: 'dev',
    folder: true,
  },
  // El idioma por defecto sin prefijo no tiene `/<idioma>/404/`: solo los demás.
  { pattern: '/[locale]/404', file: 'not-found.astro', when: 'multiLocale' },
];

/** Lo que decide qué rutas inyecta la librería. */
export interface RouteOptions {
  locales: readonly string[];
  defaultLocale: string;
  /** `privacy.page`: la librería genera la página de privacidad. */
  privacyPage?: boolean;
  /** Solo en `astro dev`: las pantallas del panel SEO on page. */
  seoOnPage?: boolean;
  /** `sitemap.include`: `sitemap.xml` es un índice y las páginas van en `sitemap-pages.xml`. */
  sitemapIndex?: boolean;
}

function isEnabled(when: RouteWhen, options: RouteOptions) {
  const multiLocale = options.locales.length > 1;
  const conditions: Record<RouteWhen, boolean> = {
    site: true,
    dev: options.seoOnPage === true,
    sitemapIndex: options.sitemapIndex === true,
    multiLocale,
    privacyPage: options.privacyPage === true,
    privacyLocales: options.privacyPage === true && multiLocale,
  };
  return conditions[when];
}

/** Las rutas a inyectar con estas opciones; solo las del sitio se prerenderizan. */
export function routesFor(options: RouteOptions) {
  return ROUTES.filter(({ when }) => isEnabled(when, options)).map((route) => ({
    ...route,
    prerender: route.when !== 'dev',
  }));
}

/** El patrón de una ruta como rutas de fichero sin extensión (`/[locale]/404` → `es/404`). */
function filePaths(pattern: string, options: RouteOptions) {
  const others = options.locales.filter((locale) => locale !== options.defaultLocale);
  switch (pattern) {
    case '/[...slug]':
      return [options.defaultLocale, ...others].map((locale) =>
        locale === options.defaultLocale ? 'index' : `${locale}/index`,
      );
    case '/[privacy]':
      return [privacySlug(options.defaultLocale)];
    case '/[locale]/[privacy]':
      return others.map((locale) => `${locale}/${privacySlug(locale)}`);
    case '/[locale]/404':
      return others.map((locale) => `${locale}/404`);
    default:
      return [pattern.slice(1)];
  }
}

/** Rutas que la integración inyecta, como ruta de fichero sin extensión: lo que un `src/pages/` del sitio puede sustituir. */
export function injectedPaths(options: RouteOptions): string[] {
  return routesFor(options).flatMap(({ pattern, folder }) =>
    filePaths(pattern, options).flatMap((path) => (folder ? [path, `${path}/index`] : [path])),
  );
}
