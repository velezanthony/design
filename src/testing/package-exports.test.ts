import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/* Las entradas de `exports` que usa un consumidor para no duplicar piezas de la librería: tienen que
   existir y, siendo publicadas, no pueden arrastrar nada del panel de dev (`seo-on-page`). */

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  exports: Record<string, string>;
};

const PUBLISHED_ENTRIES = [
  './client/theme',
  './client/consent',
  './client/storage',
  './client/toc',
  './head',
  './ui-strings',
  './site',
  './code-themes',
  './fonts',
];

/** Los módulos relativos que importa un archivo (`import … from './x'`, también `export … from`). */
function relativeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specifiers = [...source.matchAll(/(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map(
    (match) => match[1]!,
  );
  return specifiers
    .map((specifier) => resolve(dirname(file), specifier))
    .map((base) => [base, `${base}.ts`].find((candidate) => existsSync(candidate)))
    .filter((path): path is string => path?.endsWith('.ts') === true);
}

/** El archivo y todo lo que importa, transitivamente. */
function closure(entry: string): Set<string> {
  const seen = new Set<string>();
  const pending = [resolve(entry)];
  for (let file = pending.pop(); file; file = pending.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    pending.push(...relativeImports(file));
  }
  return seen;
}

describe('exports para consumidores', () => {
  it.each(PUBLISHED_ENTRIES)('%s apunta a un archivo que existe', (entry) => {
    const target = packageJson.exports[entry];
    expect(target).toBeDefined();
    expect(existsSync(target!)).toBe(true);
  });

  it.each(PUBLISHED_ENTRIES)('%s no arrastra el panel de dev (seo-on-page)', (entry) => {
    const reached = [...closure(packageJson.exports[entry]!)].filter((file) =>
      file.includes('seo-on-page'),
    );
    expect(reached).toEqual([]);
  });
});
