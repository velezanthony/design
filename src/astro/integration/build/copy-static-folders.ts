import { cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegrationLogger } from 'astro';
import { AstroError } from 'astro/errors';
import { staticExcluder, type StaticFolder } from '../../../core/content/static-folders';

interface CopyStaticFolders {
  /** La raíz del proyecto (ruta de disco): de ahí cuelga cada `from`. */
  root: string;
  /** La carpeta del build (`dist/`). */
  dir: URL;
  folders: readonly StaticFolder[];
  logger: AstroIntegrationLogger;
}

/** Copia cada carpeta de `static` a `dist/` sin tocarla (sin Markdown, sin optimizar, sin índice de búsqueda), menos lo que casa con su `exclude`. */
export async function copyStaticFolders({
  root,
  dir,
  folders,
  logger,
}: CopyStaticFolders): Promise<void> {
  for (const [index, folder] of folders.entries()) {
    const { from, to } = folder;
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
    const excluded = staticExcluder(folder);
    await cp(source, path.join(fileURLToPath(dir), to), {
      recursive: true,
      // Las carpetas pasan siempre: `exclude` juzga archivos, como en dev.
      filter: async (file) =>
        (await stat(file)).isDirectory() ||
        !excluded(path.relative(source, file).split(path.sep).join('/')),
    });
    logger.info(`static: «${from}» publicada en /${to}/`);
  }
}
