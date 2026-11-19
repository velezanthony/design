import type { AstroIntegrationLogger } from 'astro';
import { addClientPagesToSitemap } from './client-sitemap';
import { buildPagefindIndex } from './pagefind';

interface BuildDone {
  /** La carpeta del build (`dist/`). */
  dir: URL;
  pages: { pathname: string }[];
  logger: AstroIntegrationLogger;
  site: string;
  base: string;
  /** La raíz del proyecto (ruta de disco). */
  root: string;
  /** El fichero con las páginas propias (`sitemapFiles`). */
  pagesFile: string;
  /** Si el sitio sustituye ese sitemap, ya no es nuestro y no se le añade nada. */
  ownSitemap: boolean;
}

/** `astro:build:done`: el índice de búsqueda y las páginas del cliente en el sitemap. */
export async function runBuildDone({ logger, ownSitemap, ...built }: BuildDone): Promise<void> {
  await buildPagefindIndex(built.dir, logger);
  if (!ownSitemap) return;
  const added = await addClientPagesToSitemap(built);
  if (added > 0) logger.info(`sitemap: ${added} páginas de src/pages/`);
}
