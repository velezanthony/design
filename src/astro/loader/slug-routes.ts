import { existsSync } from 'node:fs';
import type { Page } from '../../core/content/discovery';
import { DocsError } from '../../core/errors';
import type { Locale } from '../../core/i18n/locale';
import { PAGE_EXTENSIONS, reservedPaths } from '../routes/routes';

/* Un `slug` del frontmatter puede llevar una página a una URL que ya tiene dueño fuera de la
   documentación: una ruta de la librería o una página del sitio en `src/pages/`. Solo se miran las
   páginas con `slug` propio: las URLs que salen del nombre del archivo se quedan como hasta ahora
   (un `src/pages/index.astro` que sustituye la portada es intencionado). */

interface SlugRouteOptions {
  defaultLocale: Locale;
  /** `srcDir` de Astro: las páginas del sitio viven en su `pages/`. */
  srcDir: URL;
}

/** Ruta de fichero de una página (sin base): `tutorials/x` o `en/tutorials/x`. */
function routePath(page: Page & { urlSlug: string }, defaultLocale: Locale): string {
  return page.locale === defaultLocale ? page.urlSlug : `${page.locale}/${page.urlSlug}`;
}

/** El fichero de `src/pages/` que sirve `path` (`path.astro`, `path/index.md`…), si existe. */
function clientPageAt(path: string, pagesDir: URL): string | undefined {
  for (const candidate of [path, `${path}/index`]) {
    for (const extension of PAGE_EXTENSIONS) {
      const file = `${candidate}.${extension}`;
      if (existsSync(new URL(file, pagesDir))) return `src/pages/${file}`;
    }
  }
  return undefined;
}

/** Un error por cada página cuyo `slug` cae en una ruta de la librería o en una página de `src/pages/`. */
export function slugRouteCollisions(
  pages: readonly Page[],
  options: SlugRouteOptions,
): DocsError[] {
  const reserved = reservedPaths();
  const pagesDir = new URL('pages/', options.srcDir);
  return pages.flatMap((page) => {
    if (page.urlSlug === undefined) return [];
    const path = routePath({ ...page, urlSlug: page.urlSlug }, options.defaultLocale);
    const library = reserved.find((route) => path === route || path.startsWith(`${route}/`));
    if (library !== undefined) {
      return [
        new DocsError(
          `slug: «${page.urlSlug}» lleva la página a /${path}/, que es una ruta de la librería (/${library}).`,
          {
            file: page.sourcePath,
            hint: 'Elige otro `slug`: esa URL la sirve @velezanthony/design.',
          },
        ),
      ];
    }
    const client = clientPageAt(path, pagesDir);
    if (client === undefined) return [];
    return [
      new DocsError(
        `slug: «${page.urlSlug}» lleva la página a /${path}/, que ya sirve ${client}.`,
        {
          file: page.sourcePath,
          hint: `Cambia el \`slug\` o mueve ${client}: dos páginas no pueden compartir URL.`,
        },
      ),
    ];
  });
}
