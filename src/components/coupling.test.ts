import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* `components/` es del paquete: no puede arrastrar rutas, alias ni datos del portfolio (design-components,
   «Sin acoplamiento al portfolio»). */
const sources = (readdirSync('src/components', { recursive: true }) as string[])
  .filter((file) => /\.(astro|ts)$/.test(file) && !file.endsWith('.test.ts'))
  .map((file) => join('src/components', file));

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
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    exports: Record<string, string>;
  };

  it('apunta a src/components', () => {
    expect(packageJson.exports['./components/*']).toBe('./src/components/*');
  });

  it.each([
    ['actions', 'Link'],
    ['display', 'Icon'],
    ['display', 'Heading'],
    ['display', 'Tag'],
    ['actions', 'Button'],
    ['form', 'Input'],
    ['form', 'Checkbox'],
  ])('el átomo %s/%s es importable', (group, name) => {
    expect(sources).toContain(`src/components/atoms/${group}/${name}.astro`);
  });
});
