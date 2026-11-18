/** Carpeta de las páginas nativas si la config no dice otra (relativa a la raíz del proyecto de Astro). */
export const DEFAULT_CONTENT_DIR = 'src/content/docs';

/** Ruta relativa sin `./`, barras de más ni `..` resolubles; los `..` iniciales se conservan. */
export function normalizePath(dir: string): string {
  const stack: string[] = [];
  for (const segment of dir.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..' && stack.length > 0 && stack[stack.length - 1] !== '..') stack.pop();
    else stack.push(segment);
  }
  return stack.join('/');
}

/**
 * Por qué `dir` no vale como carpeta de contenido, o `undefined` si vale. Debe ser una ruta
 * RELATIVA a la raíz del proyecto: una absoluta no sobreviviría a otra máquina ni a CI, y una
 * URL no es una carpeta. Tampoco puede ser la propia raíz: recorrería `node_modules` entero.
 */
export function contentDirProblem(dir: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(dir)) return 'Debe ser una ruta local, no una URL.';
  if (dir.startsWith('/') || /^[a-z]:[\\/]/i.test(dir)) {
    return 'Debe ser una ruta relativa a la raíz del proyecto de Astro (`../docs`), no absoluta.';
  }
  if (normalizePath(dir) === '') {
    return 'Debe apuntar a una carpeta de páginas (`../docs`), no a la raíz del proyecto ni quedar vacía.';
  }
  return undefined;
}
