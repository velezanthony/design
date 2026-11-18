import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SITEMAP_TOKENS, sitemapCss, themePalette } from './sitemap';

describe('themePalette', () => {
  it('toma de cada token el valor claro (el primero) y el oscuro (el segundo)', () => {
    const css = ':root { --color-ink: #111; } @media (x) { :root { --color-ink: #eee; } }';
    expect(themePalette(css, ['ink'])).toEqual({ light: { ink: '#111' }, dark: { ink: '#eee' } });
  });

  it('falla con el nombre del token si el tema no lo define en los dos modos', () => {
    expect(() => themePalette(':root { --color-ink: #111; }', ['ink'])).toThrow(/--color-ink/);
  });

  it('el tema real define todos los tokens que usa la hoja', () => {
    const theme = readFileSync('src/ui/styles/tokens.css', 'utf8');
    expect(themePalette(theme, SITEMAP_TOKENS).light.canvas).toBe('#faf9f6');
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
