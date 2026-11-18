import { DocsError } from '../errors';
import { trimBase } from '../shared/urls';

/** Ruta del favicon propio del paquete (la sirve un endpoint inyectado, con la base delante). */
export const DEFAULT_FAVICON_PATH = '/_design/favicon.png';

/** El `<link rel="icon">` ya decidido: `type` solo si la extensión se reconoce. */
export interface FaviconLink {
  href: string;
  type?: string;
}

const TYPES: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
};

/** MIME por extensión (ignora query y hash); `undefined` si no se reconoce. */
export function faviconType(src: string): string | undefined {
  const extension = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(src)?.[1]?.toLowerCase();
  return extension === undefined ? undefined : TYPES[extension];
}

/** Las URLs https no se comprueban: no hay red en el build. */
export const isLocalFavicon = (favicon: string): boolean => !favicon.startsWith('https://');

/** Ruta del archivo bajo `public/` sin barra inicial: `/img/a.png` y `img/a.png` → `img/a.png`. */
export const publicFaviconPath = (favicon: string): string => favicon.replace(/^\/+/, '');

/**
 * Decide el favicon de la página: el propio del paquete si no hay config, una URL https tal cual,
 * o un archivo de `public/` con la base delante (`favicon.svg` y `/favicon.svg` son lo mismo).
 */
export function resolveFavicon(favicon: string | undefined, base: string): FaviconLink {
  const prefix = trimBase(base);
  const href =
    favicon === undefined
      ? `${prefix}${DEFAULT_FAVICON_PATH}`
      : isLocalFavicon(favicon)
        ? `${prefix}/${publicFaviconPath(favicon)}`
        : favicon;
  const type = faviconType(href);
  return { href, ...(type !== undefined && { type }) };
}

/** Error por un favicon local que no existe; el adaptador dice si existe (la E/S no es del núcleo). */
export function faviconErrors(favicon: string | undefined, exists: boolean): DocsError[] {
  if (favicon === undefined || !isLocalFavicon(favicon) || exists) return [];
  return [
    new DocsError(`favicon: el archivo «${favicon}» no existe en \`public/\`.`, {
      hint: 'Coloca el archivo en `public/`, usa una URL https o quita `favicon` para usar el del paquete.',
    }),
  ];
}
