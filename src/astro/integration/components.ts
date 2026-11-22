import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AstroError } from 'astro/errors';

/** Pie del paquete, para los sitios sin `components.Footer`. */
export const DEFAULT_FOOTER = fileURLToPath(
  new URL('../../components/organisms/chrome/DocsFooter.astro', import.meta.url),
);

/** Archivo del pie de las páginas de docs: el del sitio (resuelto contra su raíz) o el del paquete. */
export function footerComponent(projectRoot: string, footer: string | undefined): string {
  if (footer === undefined) return DEFAULT_FOOTER;
  const file = path.resolve(projectRoot, footer);
  if (!existsSync(file)) {
    throw new AstroError(
      `La opción \`site.components.Footer\` apunta a un archivo que no existe: ${footer}`,
      `Se buscó en ${file}. Es la ruta de un componente .astro desde la raíz del proyecto (\`site: { components: { Footer: './src/components/Footer.astro' } }\`).`,
    );
  }
  return file;
}
