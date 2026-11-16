import { existsSync } from 'node:fs';
import { AstroError } from 'astro/errors';

/** Extensiones con las que Astro enruta un fichero de `src/pages/` (páginas y endpoints). */
const PAGE_EXTENSIONS = ['astro', 'md', 'mdx', 'html', 'ts', 'js', 'mts', 'mjs'];

/** Rutas que la integración inyecta, como ruta de fichero sin extensión (`es/404`). */
function injectedRoutes(locales: readonly string[], defaultLocale: string): string[] {
  const routes = ['sitemap.xml'];
  for (const locale of locales) {
    const prefix = locale === defaultLocale ? '' : `${locale}/`;
    routes.push(`${prefix}index`, `${prefix}404`);
  }
  return routes;
}

/**
 * Falla si `src/pages/` del consumidor tiene un fichero que ocupa una ruta que la integración
 * inyecta (la home, `404`, `sitemap.xml`). Astro da prioridad a la ruta estática sobre la
 * inyectada y solo avisa con un `WARN` fácil de pasar por alto, así que el sitio compilaría con
 * la página del andamio (`npm create astro`) en lugar de la documentación.
 */
export function assertNoRouteCollision(
  pagesDir: URL,
  locales: readonly string[],
  defaultLocale: string,
): void {
  const clashes: string[] = [];
  for (const route of injectedRoutes(locales, defaultLocale)) {
    // `sitemap.xml` ya lleva punto: el endpoint es `sitemap.xml.ts`, pero también vale `sitemap.xml`.
    for (const extension of ['', ...PAGE_EXTENSIONS.map((ext) => `.${ext}`)]) {
      if (route !== 'sitemap.xml' && extension === '') continue;
      const file = `${route}${extension}`;
      if (existsSync(new URL(file, pagesDir))) clashes.push(`src/pages/${file}`);
    }
  }
  if (clashes.length === 0) return;
  throw new AstroError(
    `Hay páginas propias que pisan rutas de \`@velezanthony/design\`: ${clashes.join(', ')}.`,
    'Astro da prioridad a `src/pages/`, así que esas rutas no mostrarían la documentación. Borra esos ficheros (el andamio de `npm create astro` trae `src/pages/index.astro`): la home es `src/content/docs/index.md`; `404` y `sitemap.xml` los inyecta la integración.',
  );
}
