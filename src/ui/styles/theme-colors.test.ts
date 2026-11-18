import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { themePalette } from './sitemap';
import { themeColors } from './theme-colors';

/* `<meta name="theme-color">` no puede leer una propiedad CSS, así que los valores se escriben
   dos veces. Este test es lo que mantiene honesta la copia cuando cambia la paleta. */
describe('themeColors', () => {
  const canvas = themePalette(readFileSync('src/ui/styles/tokens.css', 'utf8'), ['canvas']);

  it('coincide con el canvas claro', () => {
    expect(canvas.light.canvas).toBe(themeColors.light);
  });

  it('coincide con el canvas oscuro', () => {
    expect(canvas.dark.canvas).toBe(themeColors.dark);
  });
});
