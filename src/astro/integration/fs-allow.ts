import path from 'node:path';
import { searchForWorkspaceRoot } from 'vite';

/**
 * Carpetas que el servidor de dev de Vite debe poder servir para que las imágenes de una carpeta de
 * contenido FUERA del proyecto (`../docs`) se vean en `astro dev`. Por defecto Vite solo sirve la
 * raíz del workspace; y en cuanto se define `server.fs.allow` esa raíz deja de ser implícita, así
 * que se devuelve junto a la carpeta. Si la carpeta está dentro del proyecto no hace falta nada
 * (y no se toca `allow`, para no quitarle al consumidor el comportamiento por defecto).
 */
export function contentFsAllow(projectRoot: string, content: string): string[] {
  const directory = path.resolve(projectRoot, content);
  const relative = path.relative(projectRoot, directory);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) return [];
  return [searchForWorkspaceRoot(projectRoot), directory];
}
