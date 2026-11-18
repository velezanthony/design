import { readFileSync } from 'node:fs';
import { bundledThemes } from 'shiki';
import { describe, expect, it } from 'vitest';

import { contrast } from '../../testing/contrast';
import { codeThemes } from './code-themes';

describe('codeThemes', () => {
  it('usa github-light-default y github-dark-default', () => {
    expect(codeThemes).toEqual({ light: 'github-light-default', dark: 'github-dark-default' });
  });

  it.each(Object.entries(codeThemes))(
    '%s: cada token se lee a 4.5:1 sobre el bloque',
    async (_label, name) => {
      const theme = (await bundledThemes[name]()).default;
      const background = theme.colors?.['editor.background'];
      expect(background).toBeDefined();
      /* Un token con fondo propio (un retorno de carro suelto, por ejemplo) no es texto sobre el
         fondo del bloque. */
      const failing = (theme.tokenColors ?? [])
        .filter((token) => token.settings.foreground && !token.settings.background)
        .map((token) => ({
          scope: token.scope,
          foreground: token.settings.foreground!,
          ratio: contrast(token.settings.foreground!, background!),
        }))
        .filter(({ ratio }) => ratio < 4.5);
      expect(failing).toEqual([]);
    },
  );
});

/* Shiki escribe los colores oscuros como `--shiki-dark` y deja el cambio al sitio. El sitio pasa a
   oscuro de dos maneras (lo pide el sistema o lo elige la persona) y el código debe seguir ambas. */
describe('el tema oscuro del código', () => {
  const selectors = [
    ...readFileSync('src/ui/styles/code.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .matchAll(/([^{}]+)\{[^{}]*color:\s*var\(--shiki-dark\)/g),
  ]
    .flatMap((match) => match[1]!.split(','))
    .map((selector) => selector.trim());

  it.each([":root:not([data-theme='light'])", ":root[data-theme='dark']"])(
    'se aplica bajo %s',
    (root) => {
      expect(selectors).toContain(`${root} .astro-code`);
      expect(selectors).toContain(`${root} .astro-code span`);
    },
  );
});
