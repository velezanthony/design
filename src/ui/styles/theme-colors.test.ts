import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { themeColors } from './theme-colors';

/* `<meta name="theme-color">` no puede leer una propiedad CSS, así que los valores se escriben
   dos veces. Este test es lo que mantiene honesta la copia cuando cambia la paleta. */
describe('themeColors', () => {
  const canvas = [
    ...readFileSync('src/ui/styles/theme.css', 'utf8').matchAll(/--color-canvas:\s*([^;]+);/g),
  ].map((match) => match[1]!.trim());

  it('coincide con el canvas claro', () => {
    expect(canvas[0]).toBe(themeColors.light);
  });

  it('coincide con todos los canvas oscuros', () => {
    expect(canvas.slice(1).length).toBeGreaterThan(0);
    for (const value of canvas.slice(1)) expect(value).toBe(themeColors.dark);
  });
});
