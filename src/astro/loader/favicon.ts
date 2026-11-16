import type { DocsError } from '../../core/errors';
import { faviconErrors, isLocalFavicon, publicFaviconPath } from '../../core/seo/favicon';
import { readPublic } from './images';

/**
 * Comprueba que el favicon local de la config existe bajo `public/` (la E/S vive aquí; la decisión,
 * en `faviconErrors`). Las https y la ausencia de `favicon` no se tocan.
 */
export async function checkFavicon(
  favicon: string | undefined,
  publicDir: URL,
): Promise<DocsError[]> {
  const exists =
    favicon !== undefined &&
    isLocalFavicon(favicon) &&
    (await readPublic(publicDir, `/${publicFaviconPath(favicon)}`)) !== undefined;
  return faviconErrors(favicon, exists);
}
