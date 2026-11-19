import { describe, expect, it } from 'vitest';

import { render } from '../../../testing/render';
import Text from './Text.astro';

describe('Text', () => {
  it('es un p apagado por defecto', async () => {
    const paragraph = (await render(Text, {}, { default: 'hola' })).querySelector('p')!;
    expect(paragraph.classList.contains('text-muted')).toBe(true);
    expect(paragraph.textContent).toBe('hola');
  });

  it('cambia la etiqueta con `as`', async () => {
    expect((await render(Text, { as: 'span' })).querySelector('span')).not.toBeNull();
  });

  it('solo limita la línea con `measure`', async () => {
    const limit = 'max-w-(--container-measure)';
    expect((await render(Text)).querySelector('p')!.classList.contains(limit)).toBe(false);
    expect(
      (await render(Text, { measure: true })).querySelector('p')!.classList.contains(limit),
    ).toBe(true);
  });
});
