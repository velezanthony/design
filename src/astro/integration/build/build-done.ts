import type { AstroIntegrationLogger } from 'astro';
import { boundAnimationLoops } from './bound-animation-loops';
import { addClientPagesToSitemap } from './client-sitemap';
import { buildPagefindIndex } from './pagefind';
import { pruneOrphanAssets } from './prune-orphan-assets';

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

/** `astro:build:done`: los recursos (animaciones acotadas, huérfanos fuera), el índice de búsqueda y las páginas del cliente en el sitemap. */
export async function runBuildDone({ logger, ownSitemap, ...built }: BuildDone): Promise<void> {
  // Antes del índice: Pagefind lee `dist/` y no debe ver recursos que se van a borrar.
  await boundAnimationLoops(built.dir, logger);
  await pruneOrphanAssets(built.dir, logger);
  await buildPagefindIndex(built.dir, logger);
  if (!ownSitemap) return;
  const added = await addClientPagesToSitemap(built);
  if (added > 0) logger.info(`sitemap: ${added} páginas de src/pages/`);
}
