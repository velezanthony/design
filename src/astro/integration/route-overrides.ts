import { existsSync } from 'node:fs';
import { privacySlug } from '../../core/privacy/pages';
import { DEFAULT_FAVICON_PATH } from '../../core/seo/favicon';
import { SITEMAP_FILE, SITEMAP_PAGES, SITEMAP_STYLESHEET_PATH } from '../../core/seo/sitemap';
import { SEO_ON_PAGE_ROUTES } from '../views/seo-on-page/hrefs';

/** Extensiones con las que Astro enruta un fichero de `src/pages/` (páginas y endpoints). */
const PAGE_EXTENSIONS = ['astro', 'md', 'mdx', 'html', 'ts', 'js', 'mts', 'mjs'];

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

/** Una ruta de la librería que el sitio sustituye con un fichero suyo. */
export interface RouteOverride {
  /** El fichero del sitio, como se escribe (`src/pages/index.astro`). */
  file: string;
  /** La ruta sustituida, como ruta de fichero sin extensión (`index`, `es/404`, `sitemap.xml`). */
  route: string;
}

/** Rutas que la integración inyecta, como ruta de fichero sin extensión (`es/404`). */
function injectedRoutes(options: RouteOptions): string[] {
  const routes = [
    SITEMAP_FILE,
    ...(options.sitemapIndex ? [SITEMAP_PAGES] : []),
    SITEMAP_STYLESHEET_PATH.slice(1),
    DEFAULT_FAVICON_PATH.slice(1),
  ];
  if (options.seoOnPage) {
    for (const { pattern } of SEO_ON_PAGE_ROUTES) {
      const route = pattern.slice(1);
      routes.push(route, `${route}/index`);
    }
  }
  for (const locale of options.locales) {
    const prefix = locale === options.defaultLocale ? '' : `${locale}/`;
    routes.push(`${prefix}index`, `${prefix}404`);
    if (options.privacyPage) {
      const slug = privacySlug(locale);
      routes.push(`${prefix}${slug}`, `${prefix}${slug}/index`);
    }
  }
  return routes;
}

/** Rutas de la librería que el sitio sustituye con un fichero suyo en `src/pages/`; no es error, pero se avisa al arrancar. */
export function routeOverrides(pagesDir: URL, options: RouteOptions): RouteOverride[] {
  const overrides: RouteOverride[] = [];
  for (const route of injectedRoutes(options)) {
    // Las rutas con extensión (`sitemap.xml`) valen tal cual o como endpoint (`sitemap.xml.ts`).
    const named = /\.[a-z]+$/.test(route);
    for (const extension of ['', ...PAGE_EXTENSIONS.map((pageExtension) => `.${pageExtension}`)]) {
      if (!named && extension === '') continue;
      const file = `${route}${extension}`;
      if (existsSync(new URL(file, pagesDir))) overrides.push({ file: `src/pages/${file}`, route });
    }
  }
  return overrides;
}

/** El aviso del arranque: cuántas rutas de la librería sustituye el sitio y con qué ficheros. */
export function overrideWarning(overrides: readonly RouteOverride[]): string | undefined {
  if (overrides.length === 0) return undefined;
  const count = overrides.length === 1 ? '1 ruta' : `${overrides.length} rutas`;
  return `Tu sitio sustituye ${count} de @velezanthony/design: ${overrides.map(({ file }) => file).join(', ')}. Se publican tus páginas en su lugar.`;
}
