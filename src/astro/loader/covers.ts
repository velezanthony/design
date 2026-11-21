import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { StoredCover } from '../../core/listing/covers';
import { readPublic } from './images';

/** Portada ya comprobada de una página y, si su ruta no existe, el aviso que da el loader. */
export interface ResolvedCover {
  cover?: StoredCover;
  warning?: string;
}

async function isFile(file: string): Promise<boolean> {
  return (await stat(file).catch(() => undefined))?.isFile() ?? false;
}

/**
 * Comprueba el `index.image` de una página (`file`, absoluta). Una ruta relativa al `.md` que
 * existe pasa a `astro:assets` (siempre con `./` delante, como la resuelve el content layer); una de
 * `public/` se sirve tal cual. Si no existe, no rompe el build: avisa y deja la portada de la
 * librería. `where` es como se nombra la página en el aviso.
 */
export async function resolveCover(
  image: string | false | undefined,
  file: string,
  publicDir: URL,
  where: string,
): Promise<ResolvedCover> {
  if (image === undefined) return {};
  if (image === false) return { cover: false };
  const exists = image.startsWith('/')
    ? (await readPublic(publicDir, image)) !== undefined
    : await isFile(path.resolve(path.dirname(file), image));
  if (!exists) {
    return {
      cover: 'missing',
      warning: `${where}: index.image «${image}» no existe; se usa la portada de la librería.`,
    };
  }
  if (image.startsWith('/')) return { cover: { src: image } };
  const relative = image.startsWith('.') ? image : `./${image}`;
  return { cover: { asset: relative } };
}
