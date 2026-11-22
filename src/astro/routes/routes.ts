import { DEFAULT_FAVICON_PATH } from '../../core/seo/favicon';
import { SITEMAP_FILE, SITEMAP_PAGES, SITEMAP_STYLESHEET_PATH } from '../../core/seo/sitemap';

/** Carpeta común de las rutas del panel: lo que un consumidor no debería usar para sus páginas. */
export const SEO_ON_PAGE_DIR = 'seo-on-page';

/** Cuándo existe una ruta: siempre, solo en `astro dev` o según una opción de la config. */
type RouteWhen = 'site' | 'dev' | 'sitemapIndex';

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
];

/** Carpeta del índice de búsqueda que la integración escribe en `dist/` al construir. */
export const PAGEFIND_DIR = 'pagefind';

/** Extensiones con las que Astro enruta un fichero de `src/pages/` (páginas y endpoints). */
export const PAGE_EXTENSIONS = ['astro', 'md', 'mdx', 'html', 'ts', 'js', 'mts', 'mjs'];

/** URLs (sin base ni barras) que la librería ocupa fuera de las páginas de docs: sus rutas, en cualquier modo, y la carpeta de la búsqueda. Una página no puede vivir en ellas ni debajo. */
export function reservedPaths(): string[] {
  return [
    ...ROUTES.filter(({ pattern }) => pattern !== '/[...slug]').map(({ pattern }) =>
      pattern.slice(1),
    ),
    PAGEFIND_DIR,
  ];
}

/** Lo que decide qué rutas inyecta la librería. */
export interface RouteOptions {
  locales: readonly string[];
  defaultLocale: string;
  /** Solo en `astro dev`: las pantallas del panel SEO on page. */
  seoOnPage?: boolean;
  /** `sitemap.include`: `sitemap.xml` es un índice y las páginas van en `sitemap-pages.xml`. */
  sitemapIndex?: boolean;
}

function isEnabled(when: RouteWhen, options: RouteOptions) {
  const conditions: Record<RouteWhen, boolean> = {
    site: true,
    dev: options.seoOnPage === true,
    sitemapIndex: options.sitemapIndex === true,
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

/** El patrón de una ruta como rutas de fichero sin extensión (`/[...slug]` → `index`, `es/index`). */
function filePaths(pattern: string, options: RouteOptions) {
  const others = options.locales.filter((locale) => locale !== options.defaultLocale);
  switch (pattern) {
    case '/[...slug]':
      return [options.defaultLocale, ...others].map((locale) =>
        locale === options.defaultLocale ? 'index' : `${locale}/index`,
      );
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
