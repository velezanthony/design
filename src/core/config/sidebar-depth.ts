import { DocsError, formatPath } from '../errors';
import type { SidebarDepthUserConfig } from './schema';

/* La opción `sidebarDepth`: cuántos niveles de grupos de carpeta anida el árbol automático de la
   barra lateral. Aplicarla al árbol es de `core/navigation/sidebar.ts`; el límite de una sección
   (`nav[n].sidebarDepth`) sustituye a `default` en `core/navigation/nav-sidebar.ts`. */

/** Límites del árbol automático. Sin `default`, sin límite; cada carpeta de `overrides` cuenta desde ella. */
export interface SidebarDepth {
  default?: number;
  overrides: Record<string, number>;
}

/** Completa `sidebarDepth`: un número es el límite por defecto; sin nada, no hay límite. */
export function resolveSidebarDepth(
  user: SidebarDepthUserConfig | undefined,
): SidebarDepth | undefined {
  if (user === undefined) return undefined;
  if (typeof user === 'number') return { default: user, overrides: {} };
  return {
    ...(user.default !== undefined && { default: user.default }),
    overrides: user.overrides ?? {},
  };
}

/** Un error por cada carpeta de `overrides` sin páginas. */
export function validateSidebarDepthFolders(
  depth: SidebarDepth,
  folders: ReadonlySet<string>,
): DocsError[] {
  return Object.keys(depth.overrides)
    .filter((folder) => !folders.has(folder))
    .map(
      (folder) =>
        new DocsError(
          `${formatPath(['sidebarDepth', 'overrides', folder])}: no hay ninguna carpeta «${folder}» con páginas.`,
          {
            hint: 'Es la ruta de la carpeta dentro del contenido, sin barras (articulos, articulos/python).',
          },
        ),
    );
}
