import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { staticFoldersMiddleware } from './static-folders-dev';

const root = mkdtempSync(path.join(tmpdir(), 'static-dev-'));
mkdirSync(path.join(root, 'htmlcov/assets'), { recursive: true });
writeFileSync(path.join(root, 'htmlcov/index.html'), '<h1>cov</h1>');
writeFileSync(path.join(root, 'htmlcov/assets/app.js'), 'let x');
writeFileSync(path.join(root, 'secret.txt'), 'no');
const serve = staticFoldersMiddleware({
  root,
  base: '/repo/',
  folders: [{ from: 'htmlcov', to: 'coverage' }],
});

/** Responde y recoge lo escrito; resuelve cuando termina o cuando se pasó a `next`. */
async function get(url: string, method = 'GET') {
  const chunks: Buffer[] = [];
  const headers: Record<string, string> = {};
  const response = Object.assign(
    new Writable({
      write(chunk, _encoding, done) {
        chunks.push(chunk);
        done();
      },
    }),
    { setHeader: (name: string, value: string) => void (headers[name] = value) },
  );
  const next = vi.fn();
  await new Promise<void>((resolve) => {
    response.on('finish', resolve);
    next.mockImplementation(resolve);
    // Como en Vite: `url` ya sin el base y `originalUrl` entera.
    void serve(
      { url: url.replace('/repo', ''), originalUrl: url, method } as never,
      response as never,
      next,
    );
  });
  return { body: Buffer.concat(chunks).toString(), headers, next };
}

describe('staticFoldersMiddleware', () => {
  it('sirve el index.html de la carpeta en su raíz', async () => {
    const result = await get('/repo/coverage/');
    expect(result.body).toBe('<h1>cov</h1>');
    expect(result.headers['Content-Type']).toContain('text/html');
  });

  it('sirve los demás ficheros con su tipo', async () => {
    const result = await get('/repo/coverage/assets/app.js');
    expect(result.body).toBe('let x');
    expect(result.headers['Content-Type']).toContain('text/javascript');
  });

  it('lo que no es suyo pasa al siguiente: otra ruta, un fichero ausente o salirse de la carpeta', async () => {
    for (const url of [
      '/repo/guide/',
      '/repo/coverage/nope.html',
      '/repo/coverage/%2e%2e/secret.txt',
    ]) {
      expect((await get(url)).next).toHaveBeenCalled();
    }
  });

  it('solo atiende GET y HEAD', async () => {
    expect((await get('/repo/coverage/', 'POST')).next).toHaveBeenCalled();
    expect((await get('/repo/coverage/', 'HEAD')).body).toBe('');
  });
});
