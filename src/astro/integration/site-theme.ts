import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AstroError } from 'astro/errors';

/** Lo que importa `theme.css` en último lugar; la integración lo apunta al CSS del sitio. */
export const SITE_THEME_SPECIFIER = '@velezanthony/design/site-theme';

/** CSS vacío del paquete, para los sitios sin `theme`. */
export const EMPTY_SITE_THEME = fileURLToPath(
  new URL('../../components/styles/site-theme.css', import.meta.url),
);

/** Alias de Vite del especificador exacto (con un prefijo, `/otro` caería también) al CSS del sitio. */
export function siteThemeAlias(
  projectRoot: string,
  theme: string | undefined,
): { find: RegExp; replacement: string } {
  const find = /^@velezanthony\/design\/site-theme$/;
  if (theme === undefined) return { find, replacement: EMPTY_SITE_THEME };
  const file = path.resolve(projectRoot, theme);
  if (!existsSync(file)) {
    throw new AstroError(
      `La opción \`site.theme\` apunta a un archivo que no existe: ${theme}`,
      `Se buscó en ${file}. Es la ruta de un CSS desde la raíz del proyecto (\`site: { theme: 'src/styles/site.css' }\`).`,
    );
  }
  return { find, replacement: file };
}
