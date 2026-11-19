import { normalizePath } from './content-dir';

/** Una carpeta que se publica tal cual: `from` desde la raíz del proyecto, `to` bajo la raíz del sitio. */
export interface StaticFolder {
  from: string;
  to: string;
}

/** Lo que la librería ya sirve en la raíz del sitio. */
const RESERVED = ['_astro', 'pagefind'];

/** Por qué la carpeta no vale, o `undefined` si vale; el solape entre carpetas lo juzga quien las ve todas. */
export function staticFolderProblem(
  folder: StaticFolder,
  locales: readonly string[],
): string | undefined {
  const { from, to } = folder;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(from)) return '`from` debe ser una ruta local, no una URL.';
  if (from.startsWith('/') || /^[a-z]:[\\/]/i.test(from) || normalizePath(from) === '') {
    return '`from` debe ser una carpeta relativa a la raíz del proyecto (`../htmlcov`).';
  }
  if (to.startsWith('/') || to.endsWith('/') || to.startsWith('..') || normalizePath(to) !== to) {
    return 'El destino (`to`) debe ser una ruta limpia bajo el sitio (`coverage`): sin barras en los extremos ni `.`, `..` o `//`.';
  }
  const first = to.split('/')[0]!;
  if (RESERVED.includes(first) || locales.includes(first)) {
    return `El destino «${first}» ya lo usa el sitio (carpetas de la librería e idiomas): elige otro.`;
  }
  return undefined;
}

/** Dos destinos chocan si son el mismo o uno cuelga del otro. */
export function staticDestinationsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

/** A qué carpeta estática y a qué ruta interna corresponde una petición; `undefined` si no es de ninguna o intenta salirse. */
export function matchStaticRequest(
  pathname: string,
  base: string,
  folders: readonly StaticFolder[],
): { folder: StaticFolder; inside: string } | undefined {
  const root = base.endsWith('/') ? base : `${base}/`;
  if (!pathname.startsWith(root)) return undefined;
  let relative: string;
  try {
    relative = decodeURIComponent(pathname.slice(root.length));
  } catch {
    return undefined;
  }
  const folder = folders.find(
    ({ to }) => relative === to || relative === `${to}/` || relative.startsWith(`${to}/`),
  );
  if (!folder) return undefined;
  const inside = relative.slice(folder.to.length).replace(/^\//, '');
  if (inside.split('/').includes('..')) return undefined;
  return { folder, inside };
}
