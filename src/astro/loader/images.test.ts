import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkSeoImages, readImageSizes } from './images';

/** PNG mínimo válido para leer sus dimensiones; `extra` infla el peso sin cambiar la cabecera. */
function png(width: number, height: number, extra = 0): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8;
  header[25] = 6;
  return Buffer.concat([header, Buffer.alloc(extra)]);
}

let dir: string;
let publicDir: URL;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'docs-images-'));
  await mkdir(path.join(dir, 'public/img'), { recursive: true });
  publicDir = pathToFileURL(`${path.join(dir, 'public')}/`);
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('checkSeoImages', () => {
  it('una imagen 1200x630 ligera no da errores ni avisos', async () => {
    await writeFile(path.join(dir, 'public/og.png'), png(1200, 630));
    const result = await checkSeoImages([{ src: '/og.png', field: 'seo.image.src' }], publicDir);
    expect(result).toEqual({ errors: [], warnings: [] });
  });

  it('las ausentes se agregan todas, cada una con su archivo y campo', async () => {
    const { errors } = await checkSeoImages(
      [
        { src: '/falta.png', field: 'seo.image.src', file: 'a.md' },
        { src: '/img/otra.png', field: 'seo.image.src', file: 'b.md' },
        { src: '/base.png', field: 'seo.image.src' },
      ],
      publicDir,
    );
    expect(errors.map((error) => error.file)).toEqual(['a.md', 'b.md', undefined]);
  });

  it('las https no se comprueban ni dan avisos', async () => {
    const result = await checkSeoImages(
      [{ src: 'https://cdn.dev/og.png', field: 'seo.image.src' }],
      publicDir,
    );
    expect(result).toEqual({ errors: [], warnings: [] });
  });

  it('avisa de proporción y de peso con el archivo de origen', async () => {
    await writeFile(path.join(dir, 'public/cuadrada.png'), png(1000, 1000, 400 * 1024));
    const { errors, warnings } = await checkSeoImages(
      [{ src: '/cuadrada.png', field: 'seo.image.src', file: 'a.md' }],
      publicDir,
    );
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('a.md');
    expect(warnings.join('\n')).toContain('1000×1000');
    expect(warnings.join('\n')).toContain('KB');
  });

  it('una imagen que no se deja leer avisa en vez de romper', async () => {
    await writeFile(path.join(dir, 'public/rota.png'), 'no soy una imagen');
    const { errors, warnings } = await checkSeoImages(
      [{ src: '/rota.png', field: 'seo.image.src' }],
      publicDir,
    );
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('/rota.png');
  });

  it('una ruta que se sale de public/ cuenta como ausente', async () => {
    await writeFile(path.join(dir, 'secreto.png'), png(1200, 630));
    const { errors } = await checkSeoImages(
      [{ src: '/../secreto.png', field: 'seo.image.src' }],
      publicDir,
    );
    expect(errors).toHaveLength(1);
  });

  it('la misma imagen en varias páginas se lee una sola vez pero avisa en cada una', async () => {
    await writeFile(path.join(dir, 'public/sq.png'), png(500, 500));
    const { warnings } = await checkSeoImages(
      [
        { src: '/sq.png', field: 'seo.image.src', file: 'a.md' },
        { src: '/sq.png', field: 'seo.image.src', file: 'b.md' },
      ],
      publicDir,
    );
    expect(warnings).toHaveLength(2);
  });
});

describe('readImageSizes', () => {
  it('lee las dimensiones de las locales y omite https, ausentes e ilegibles', async () => {
    await writeFile(path.join(dir, 'public/og.png'), png(1200, 630));
    await writeFile(path.join(dir, 'public/roto.png'), 'no es una imagen');
    const sizes = await readImageSizes(
      ['/og.png', '/og.png', 'https://cdn.dev/x.png', '/falta.png', '/roto.png'],
      publicDir,
    );
    expect([...sizes]).toEqual([['/og.png', { width: 1200, height: 630 }]]);
  });
});
