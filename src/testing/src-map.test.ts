import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* `mapa-de-src.md` describe el árbol real: cada carpeta y cada archivo que no sea un test ni una fixture
   tiene que aparecer, y no puede quedar nombrado un archivo que ya no existe. */

const SOURCE = 'src';
const MAP = readFileSync('docs/src/content/docs/arquitectura/mapa-de-src.md', 'utf8');

/** Entradas de `src/` sin tests, fixtures ni archivos ocultos, con ruta relativa a `src/`. */
function entries(directory: string, prefix = ''): { path: string; isDirectory: boolean }[] {
  return readdirSync(join(SOURCE, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    if (
      entry.name === 'fixtures' ||
      entry.name.startsWith('.') ||
      entry.name.endsWith('.test.ts')
    ) {
      return [];
    }
    if (!entry.isDirectory()) return [{ path, isDirectory: false }];
    const inside = entries(join(directory, entry.name), path);
    // Una carpeta que solo tiene tests o fixtures no tiene nada que contar.
    return inside.length === 0 ? [] : [{ path, isDirectory: true }, ...inside];
  });
}

const tree = entries('');
const fileNames = new Set(
  tree.filter((entry) => !entry.isDirectory).map((entry) => basename(entry.path)),
);

/** Un componente `.astro` se nombra sin extensión (`Button`); el resto, con ella (`slug.ts`). */
function mentions(name: string): boolean {
  const spelled = extname(name) === '.astro' ? basename(name, '.astro') : name;
  const escaped = spelled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w.-])${escaped}(?![\\w-])`).test(MAP);
}

describe('mapa de src/', () => {
  it('nombra cada archivo de src/ (salvo tests y fixtures)', () => {
    const missing = tree
      .filter((entry) => !entry.isDirectory && !mentions(basename(entry.path)))
      .map((entry) => entry.path);
    expect(missing).toEqual([]);
  });

  it('nombra cada carpeta de src/', () => {
    const missing = tree
      .filter((entry) => entry.isDirectory && !MAP.includes(`${basename(entry.path)}/`))
      .map((entry) => entry.path);
    expect(missing).toEqual([]);
  });

  it('no nombra archivos que ya no existen', () => {
    const named = [
      ...MAP.matchAll(/(?<![\w.-])([\w.-]+\.(?:ts|astro|css|png|d\.ts))(?![\w-])/g),
    ].map((match) => match[1]!);
    // Los tests se citan como ejemplo (`slug.test.ts`); no cuentan como archivos del mapa.
    const stale = [...new Set(named)].filter(
      (name) => !name.endsWith('.test.ts') && !fileNames.has(name),
    );
    expect(stale).toEqual([]);
  });
});
