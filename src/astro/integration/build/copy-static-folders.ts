import { cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegrationLogger } from 'astro';
import { AstroError } from 'astro/errors';
import type { StaticFolder } from '../../../core/content/static-folders';

interface CopyStaticFolders {
  /** La raíz del proyecto (ruta de disco): de ahí cuelga cada `from`. */
  root: string;
  /** La carpeta del build (`dist/`). */
  dir: URL;
  folders: readonly StaticFolder[];
  logger: AstroIntegrationLogger;
}

/** Copia cada carpeta de `static` a `dist/` sin tocarla: sin Markdown, sin optimizar, sin índice de búsqueda. */
export async function copyStaticFolders({
  root,
  dir,
  folders,
  logger,
}: CopyStaticFolders): Promise<void> {
  for (const [index, { from, to }] of folders.entries()) {
    const source = path.resolve(root, from);
    const exists = await stat(source).then(
      (info) => info.isDirectory(),
      () => false,
    );
    if (!exists) {
      throw new AstroError(
        `static[${index}].from: no existe la carpeta «${from}».`,
        'Genérala antes del build (el informe de cobertura, por ejemplo) o quita la entrada.',
      );
    }
    await cp(source, path.join(fileURLToPath(dir), to), { recursive: true });
    logger.info(`static: «${from}» publicada en /${to}/`);
  }
}
