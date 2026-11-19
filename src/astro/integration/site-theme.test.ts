import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { EMPTY_SITE_THEME, SITE_THEME_SPECIFIER, siteThemeAlias } from './site-theme';

function project(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'site-theme-'));
  writeFileSync(path.join(root, 'site.css'), '@theme { --color-todo: red; }');
  return root;
}

describe('siteThemeAlias', () => {
  it('sin `theme` apunta al CSS vacío del paquete', () => {
    const alias = siteThemeAlias(project(), undefined);
    expect(alias.replacement).toBe(EMPTY_SITE_THEME);
  });

  it('con `theme` apunta al fichero, resuelto contra la raíz del proyecto', () => {
    const root = project();
    expect(siteThemeAlias(root, 'site.css').replacement).toBe(path.join(root, 'site.css'));
  });

  it('el alias casa solo con el especificador exacto', () => {
    const { find } = siteThemeAlias(project(), undefined);
    expect(find.test(SITE_THEME_SPECIFIER)).toBe(true);
    expect(find.test(`${SITE_THEME_SPECIFIER}/otro`)).toBe(false);
    expect(find.test('@velezanthony/design/theme.css')).toBe(false);
  });

  it('un fichero que no existe falla nombrando la ruta y la opción', () => {
    function attempt() {
      return siteThemeAlias(project(), 'nope.css');
    }
    expect(attempt).toThrow(AstroError);
    expect(attempt).toThrow(/theme.*nope\.css/s);
  });

  it('el CSS vacío del paquete existe', () => {
    expect(() => siteThemeAlias(project(), undefined)).not.toThrow();
  });
});

describe('theme.css', () => {
  it('importa el CSS del sitio el último, con el especificador que la integración aliasa', () => {
    const entry = readFileSync('src/components/styles/theme.css', 'utf8');
    const imports = [...entry.matchAll(/@import '([^']+)'/g)].map((match) => match[1]);
    expect(imports.at(-1)).toBe(SITE_THEME_SPECIFIER);
  });

  it('el especificador está exportado por el paquete: así lo resuelven las herramientas sin alias', () => {
    const { exports } = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(exports[SITE_THEME_SPECIFIER.replace('@velezanthony/design', '.')]).toBe(
      './src/components/styles/site-theme.css',
    );
  });
});
