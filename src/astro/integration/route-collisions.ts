import { existsSync } from 'node:fs';
import { AstroError } from 'astro/errors';
import { privacySlug } from '../../core/privacy/pages';
import { SEO_ON_PAGE_ROUTES } from '../views/seo-on-page/hrefs';

/** Extensiones con las que Astro enruta un fichero de `src/pages/` (páginas y endpoints). */
const PAGE_EXTENSIONS = ['astro', 'md', 'mdx', 'html', 'ts', 'js', 'mts', 'mjs'];

/** Rutas que la integración inyecta, como ruta de fichero sin extensión (`es/404`). */
function injectedRoutes(
  locales: readonly string[],
  defaultLocale: string,
  privacyPage: boolean,
  seoOnPage: boolean,
  sitemapIndex: boolean,
): string[] {
  const routes = ['sitemap.xml', ...(sitemapIndex ? ['sitemap-pages.xml'] : [])];
  if (seoOnPage) {
    for (const { pattern } of SEO_ON_PAGE_ROUTES) {
      const route = pattern.slice(1);
      routes.push(route, `${route}/index`);
    }
  }
  for (const locale of locales) {
    const prefix = locale === defaultLocale ? '' : `${locale}/`;
    routes.push(`${prefix}index`, `${prefix}404`);
    if (privacyPage) {
      const slug = privacySlug(locale);
      routes.push(`${prefix}${slug}`, `${prefix}${slug}/index`);
    }
  }
  return routes;
}

/**
 * Falla si `src/pages/` del consumidor tiene un fichero que ocupa una ruta que la integración
 * inyecta (la home, `404`, `sitemap.xml` y, con `privacy.page`, la página de privacidad y, solo en dev, las del panel SEO on page). Astro da prioridad a la ruta estática sobre la
 * inyectada y solo avisa con un `WARN` fácil de pasar por alto, así que el sitio compilaría con
 * la página del andamio (`npm create astro`) en lugar de la documentación.
 */
export function assertNoRouteCollision(
  pagesDir: URL,
  locales: readonly string[],
  defaultLocale: string,
  privacyPage = false,
  seoOnPage = false,
  sitemapIndex = false,
): void {
  const clashes: string[] = [];
  for (const route of injectedRoutes(
    locales,
    defaultLocale,
    privacyPage,
    seoOnPage,
    sitemapIndex,
  )) {
    // Los sitemaps ya llevan punto: el endpoint es `sitemap.xml.ts`, pero también vale `sitemap.xml`.
    for (const extension of ['', ...PAGE_EXTENSIONS.map((ext) => `.${ext}`)]) {
      if (!route.endsWith('.xml') && extension === '') continue;
      const file = `${route}${extension}`;
      if (existsSync(new URL(file, pagesDir))) clashes.push(`src/pages/${file}`);
    }
  }
  if (clashes.length === 0) return;
  throw new AstroError(
    `Hay páginas propias que pisan rutas de \`@velezanthony/design\`: ${clashes.join(', ')}.`,
    'Astro da prioridad a `src/pages/`, así que esas rutas no mostrarían la documentación. Borra esos ficheros (el andamio de `npm create astro` trae `src/pages/index.astro`): la home es el `index.md` de la carpeta de contenido (`src/content/docs/index.md` por defecto); `404` y `sitemap.xml` los inyecta la integración.',
  );
}
