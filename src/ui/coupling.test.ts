import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* `ui/` es del paquete: no puede arrastrar rutas, alias ni datos del portfolio (design-components,
   «Sin acoplamiento al portfolio»). */
const sources = (readdirSync('src/ui', { recursive: true }) as string[])
  .filter((file) => /\.(astro|ts)$/.test(file) && !file.endsWith('.test.ts'))
  .map((file) => join('src/ui', file));

const FORBIDDEN =
  /@i18n|@atoms|@molecules|@organisms|@styles|@\/(test|client|data|components)|\bprofile\b|\/ui['"]|Cambiar tema/;

describe('ui/ sin acoplamiento al portfolio', () => {
  it('encuentra fuentes que comprobar', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it.each(sources)('%s no referencia alias ni datos del portfolio', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(FORBIDDEN);
  });
});

describe('subpath ./components/*', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    exports: Record<string, string>;
  };

  it('apunta a src/ui', () => {
    expect(pkg.exports['./components/*']).toBe('./src/ui/*');
  });

  it.each(['Link', 'Icon', 'Heading', 'Tag', 'Rule', 'Button', 'Input', 'Checkbox'])(
    'el átomo %s es importable',
    (name) => {
      expect(sources).toContain(`src/ui/atoms/${name}.astro`);
    },
  );
});
