import { describe, expect, it } from 'vitest';

import Icon from '../ui/atoms/Icon.astro';
import { render, text } from './render';

describe('render', () => {
  it('devuelve un documento consultable con el HTML del componente', async () => {
    const doc = await render(Icon, { name: 'arrow' });
    expect(doc.querySelector('svg')).not.toBeNull();
  });

  it('pasa las props al componente', async () => {
    const path = async (name: string) =>
      (await render(Icon, { name })).querySelector('path')?.getAttribute('d');
    expect(await path('arrow')).not.toBe(await path('github'));
  });

  it('text colapsa el espacio y tolera nulos', () => {
    expect(text({ textContent: '  a \n  b ' })).toBe('a b');
    expect(text(null)).toBe('');
  });
});
