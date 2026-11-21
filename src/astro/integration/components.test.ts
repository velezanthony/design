import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FOOTER, footerComponent } from './components';

function project(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'components-'));
  writeFileSync(path.join(root, 'Footer.astro'), '<footer>Propio</footer>');
  return root;
}

describe('footerComponent', () => {
  it('sin `components.Footer` es el DocsFooter del paquete', () => {
    expect(footerComponent(project(), undefined)).toBe(DEFAULT_FOOTER);
    expect(DEFAULT_FOOTER).toMatch(/organisms[/\\]chrome[/\\]DocsFooter\.astro$/);
    expect(existsSync(DEFAULT_FOOTER)).toBe(true);
  });

  it('con `components.Footer` es el archivo, resuelto contra la raíz del proyecto', () => {
    const root = project();
    expect(footerComponent(root, './Footer.astro')).toBe(path.join(root, 'Footer.astro'));
  });

  it('un archivo que no existe falla nombrando la opción, la ruta y dónde se buscó', () => {
    const root = project();
    function attempt() {
      return footerComponent(root, './src/Nope.astro');
    }
    expect(attempt).toThrow(AstroError);
    expect(attempt).toThrow(/components\.Footer.*src\/Nope\.astro/s);
    try {
      attempt();
    } catch (error) {
      expect((error as AstroError).hint).toContain(path.join(root, 'src/Nope.astro'));
    }
  });
});
