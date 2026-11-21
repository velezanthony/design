import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import CoverPlaceholder from './CoverPlaceholder.astro';

describe('CoverPlaceholder', () => {
  it('es decorativo: oculto a los lectores de pantalla, con la etiqueta solo a la vista', async () => {
    const document = await render(CoverPlaceholder, { label: 'Redes', pattern: 'dots' });
    const cover = document.querySelector('[data-cover-placeholder]')!;
    expect(cover.getAttribute('aria-hidden')).toBe('true');
    expect(cover.getAttribute('data-pattern')).toBe('dots');
    expect(text(cover)).toBe('Redes');
  });

  it('sin etiqueta solo queda el dibujo', async () => {
    const document = await render(CoverPlaceholder, { pattern: 'grid' });
    expect(text(document.querySelector('[data-cover-placeholder]'))).toBe('');
  });
});
