import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SITEMAP_TOKENS, sitemapCss, themePalette } from './sitemap';

describe('themePalette', () => {
  it('toma de cada `light-dark()` el valor claro (el primero) y el oscuro (el segundo)', () => {
    const css = '@theme { --color-ink: light-dark(#111, #eee); /* nota */ }';
    expect(themePalette(css, ['ink'])).toEqual({ light: { ink: '#111' }, dark: { ink: '#eee' } });
  });

  it('un token sin `light-dark()` vale igual en los dos modos', () => {
    const css = '@theme { --color-inverse-ink: #e0e8e8; }';
    expect(themePalette(css, ['inverse-ink'])).toEqual({
      light: { 'inverse-ink': '#e0e8e8' },
      dark: { 'inverse-ink': '#e0e8e8' },
    });
  });

  it('falla con el nombre del token si el tema no lo define', () => {
    expect(() => themePalette('@theme { --color-ink: light-dark(#111, #eee); }', ['rule'])).toThrow(
      /--color-rule/,
    );
  });

  it('el valor oscuro de un `light-dark()` no se confunde con el de otro token', () => {
    const css = '--color-a: light-dark(#111, #222); --color-b: light-dark(#333, #444);';
    expect(themePalette(css, ['b']).dark).toEqual({ b: '#444' });
  });

  it('el tema real define todos los tokens que usa la hoja', () => {
    const theme = readFileSync('src/ui/styles/tokens.css', 'utf8');
    const palette = themePalette(theme, SITEMAP_TOKENS);
    expect(palette.light.canvas).toBe('#faf9f6');
    expect(palette.dark.canvas).toBe('#141311');
  });
});

describe('sitemapCss', () => {
  const palette = { light: { canvas: '#fff' }, dark: { canvas: '#000' } };

  it('declara la paleta recibida, la oscura dentro de su media query', () => {
    const css = sitemapCss({ title: 'T', note: 'N' }, palette);
    expect(css).toMatch(/:root \{[^}]*--canvas: #fff;/);
    expect(css).toMatch(/prefers-color-scheme: dark\) \{ :root \{ --canvas: #000;/);
  });

  it('escribe el título y la nota como cadenas CSS', () => {
    const css = sitemapCss({ title: 'Mapa del sitio', note: 'Para buscadores.' }, palette);
    expect(css).toContain('content: "Mapa del sitio"');
    expect(css).toContain('content: "Para buscadores."');
  });

  it('escapa comillas, barras y saltos de línea: un texto propio no rompe la hoja', () => {
    const css = sitemapCss({ title: 'El "mapa"', note: 'a\\b\nc' }, palette);
    expect(css).toContain('content: "El \\"mapa\\""');
    expect(css).toContain('content: "a\\\\b\\A c"');
  });
});
