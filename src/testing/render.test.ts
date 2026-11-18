import { describe, expect, it } from 'vitest';

import Icon from '../components/atoms/Icon.astro';
import { render, text } from './render';

describe('render', () => {
  it('devuelve un documento consultable con el HTML del componente', async () => {
    const htmlDocument = await render(Icon, { name: 'arrow' });
    expect(htmlDocument.querySelector('svg')).not.toBeNull();
  });

  it('pasa las props al componente', async () => {
    async function path(name: string) {
      return (await render(Icon, { name })).querySelector('path')?.getAttribute('d');
    }
    expect(await path('arrow')).not.toBe(await path('github'));
  });

  it('text colapsa el espacio y tolera nulos', () => {
    expect(text({ textContent: '  a \n  b ' })).toBe('a b');
    expect(text(null)).toBe('');
  });
});
