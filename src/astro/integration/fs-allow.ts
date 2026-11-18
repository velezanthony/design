import path from 'node:path';
import { searchForWorkspaceRoot } from 'vite';

/** Carpetas que Vite debe servir para ver las imágenes de un contenido FUERA del proyecto; al definir `server.fs.allow` la raíz deja de ser implícita, por eso se devuelve también. */
export function contentFsAllow(projectRoot: string, content: string): string[] {
  const directory = path.resolve(projectRoot, content);
  const relative = path.relative(projectRoot, directory);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) return [];
  return [searchForWorkspaceRoot(projectRoot), directory];
}
