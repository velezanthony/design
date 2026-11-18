import { fileURLToPath } from 'node:url';
import type { AstroIntegrationLogger } from 'astro';
import { AstroError } from 'astro/errors';
import * as pagefind from 'pagefind';

/** Indexa `dist/` con Pagefind; `base` no interviene al indexar, lo aplica el cliente al cargar `pagefind.js`. */
export async function buildPagefindIndex(
  directory: URL,
  logger: AstroIntegrationLogger,
): Promise<void> {
  const log = logger.fork('design:pagefind');
  const path = fileURLToPath(directory);
  try {
    const { index, errors } = await pagefind.createIndex();
    if (!index) throw new AstroError('Pagefind no pudo crear el índice.', errors.join('\n'));
    const added = await index.addDirectory({ path });
    if (added.errors.length > 0) {
      throw new AstroError('Pagefind no pudo indexar `dist/`.', added.errors.join('\n'));
    }
    const written = await index.writeFiles({
      outputPath: fileURLToPath(new URL('pagefind/', directory)),
    });
    if (written.errors.length > 0) {
      throw new AstroError('Pagefind no pudo escribir el índice.', written.errors.join('\n'));
    }
    log.info(`${added.page_count} páginas indexadas.`);
  } finally {
    await pagefind.close();
  }
}
