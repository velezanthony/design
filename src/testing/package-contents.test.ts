import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);

/**
 * Qué viaja a quien instala el paquete. El sitio de docs, el playground, las fixtures y los
 * tests viven en este mismo repo, pero NO deben publicarse: lo comprueba `npm pack --dry-run`, que
 * es lo que npm empaquetaría de verdad (respeta `files` y sus exclusiones).
 */
const packedFiles = (): Promise<string[]> => (packed ??= pack());
let packed: Promise<string[]> | undefined;

async function pack(): Promise<string[]> {
  const { stdout } = await run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    maxBuffer: 16 * 1024 * 1024,
  });
  const [pack] = JSON.parse(stdout) as { files: { path: string }[] }[];
  return pack!.files.map((file) => file.path);
}

describe('contenido del paquete', { timeout: 60_000 }, () => {
  it('solo empaqueta package.json, README.md y lo que hay bajo src/', async () => {
    const files = await packedFiles();
    expect(files).toContain('package.json');
    expect(files.some((path) => path.startsWith('src/'))).toBe(true);
    const unexpected = files.filter(
      (path) => path !== 'package.json' && path !== 'README.md' && !path.startsWith('src/'),
    );
    expect(unexpected).toEqual([]);
  });

  it.each([
    ['tests', (path: string) => /\.test\.ts$/.test(path)],
    ['fixtures', (path: string) => path.split('/').includes('fixtures')],
    ['src/testing', (path: string) => path.startsWith('src/testing/')],
    ['src/pages', (path: string) => path.startsWith('src/pages/')],
    ['playground', (path: string) => path.startsWith('playground/')],
    ['docs', (path: string) => path.startsWith('docs/')],
  ])('no empaqueta %s', async (_name, matches) => {
    expect((await packedFiles()).filter(matches)).toEqual([]);
  });
});
