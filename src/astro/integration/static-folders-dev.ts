import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { matchStaticRequest, type StaticFolder } from '../../core/content/static-folders';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

interface StaticFoldersDev {
  /** La raíz del proyecto (ruta de disco). */
  root: string;
  /** El `base` de Astro. */
  base: string;
  folders: readonly StaticFolder[];
}

/** Middleware de `dev`: sirve las carpetas de `static` como en el build, sin pasar por Astro. */
export function staticFoldersMiddleware({ root, base, folders }: StaticFoldersDev) {
  return async function serve(
    request: IncomingMessage & { originalUrl?: string },
    response: ServerResponse,
    next: () => void,
  ): Promise<void> {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();
    // Vite le quita el `base` a `url`; `originalUrl` conserva la petición entera.
    const requested = request.originalUrl ?? request.url ?? '/';
    const match = matchStaticRequest(
      new URL(requested, 'http://localhost').pathname,
      base,
      folders,
    );
    if (!match) return next();
    const source = path.resolve(root, match.folder.from);
    let file = path.resolve(source, match.inside);
    if (file !== source && !file.startsWith(`${source}${path.sep}`)) return next();
    const info = await stat(file).catch(() => undefined);
    if (info?.isDirectory()) file = path.join(file, 'index.html');
    if (!(await stat(file).catch(() => undefined))?.isFile()) return next();
    response.setHeader(
      'Content-Type',
      CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
    );
    if (request.method === 'HEAD') return void response.end();
    createReadStream(file).pipe(response);
  };
}
