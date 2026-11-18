/** Carpeta de las páginas nativas si la config no dice otra (relativa a la raíz del proyecto de Astro). */
export const DEFAULT_CONTENT_DIR = 'src/content/docs';

/** Ruta relativa sin `./`, barras de más ni `..` resolubles; los `..` iniciales se conservan. */
export function normalizePath(directory: string): string {
  const stack: string[] = [];
  for (const segment of directory.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..' && stack.length > 0 && stack[stack.length - 1] !== '..') stack.pop();
    else stack.push(segment);
  }
  return stack.join('/');
}

/** Por qué `dir` no vale como carpeta de contenido: debe ser relativa y no la raíz (recorrería `node_modules`). */
export function contentDirProblem(directory: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(directory)) return 'Debe ser una ruta local, no una URL.';
  if (directory.startsWith('/') || /^[a-z]:[\\/]/i.test(directory)) {
    return 'Debe ser una ruta relativa a la raíz del proyecto de Astro (`../docs`), no absoluta.';
  }
  if (normalizePath(directory) === '') {
    return 'Debe apuntar a una carpeta de páginas (`../docs`), no a la raíz del proyecto ni quedar vacía.';
  }
  return undefined;
}
