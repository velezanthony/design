import type { AstroIntegrationLogger } from 'astro';
import type { StaticFolder } from '../../../core/content/static-folders';
import { boundAnimationLoops } from './bound-animation-loops';
import { addClientPagesToSitemap } from './client-sitemap';
import { copyStaticFolders } from './copy-static-folders';
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
  /** Carpetas que se publican tal cual (`static` de la config). */
  staticFolders: readonly StaticFolder[];
}

/** `astro:build:done`: los recursos (animaciones acotadas, huérfanos fuera), el índice de búsqueda, las páginas del cliente en el sitemap y las carpetas estáticas. */
export async function runBuildDone({
  logger,
  ownSitemap,
  staticFolders,
  ...built
}: BuildDone): Promise<void> {
  // Antes del índice: Pagefind lee `dist/` y no debe ver recursos que se van a borrar.
  await boundAnimationLoops(built.dir, logger);
  await pruneOrphanAssets(built.dir, logger);
  await buildPagefindIndex(built.dir, logger);
  if (ownSitemap) {
    const added = await addClientPagesToSitemap(built);
    if (added > 0) logger.info(`sitemap: ${added} páginas de src/pages/`);
  }
  // Lo último: lo publicado tal cual no pasa por la poda, el índice ni el sitemap.
  await copyStaticFolders({ root: built.root, dir: built.dir, folders: staticFolders, logger });
}
