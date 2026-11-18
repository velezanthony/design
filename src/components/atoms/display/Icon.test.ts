import { describe, expect, it } from 'vitest';

import { render } from '../../../testing/render';
import Icon from './Icon.astro';

async function svg(props: Record<string, unknown>) {
  return (await render(Icon, props)).querySelector('svg')!;
}

describe('Icon', () => {
  it('es decorativo: oculto a la accesibilidad y sin foco', async () => {
    const element = await svg({ name: 'arrow' });
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.getAttribute('focusable')).toBe('false');
  });

  it('respeta el tamaño y por defecto mide 16', async () => {
    expect((await svg({ name: 'arrow' })).getAttribute('width')).toBe('16');
    expect((await svg({ name: 'arrow', size: 24 })).getAttribute('height')).toBe('24');
  });

  it('rellena los logotipos y traza los demás', async () => {
    expect((await svg({ name: 'github' })).getAttribute('fill')).toBe('currentColor');
    expect((await svg({ name: 'external' })).getAttribute('stroke')).toBe('currentColor');
  });

  it.each(['github', 'external', 'arrow'])('dibuja %s', async (name) => {
    expect((await svg({ name })).querySelector('path')?.getAttribute('d')).toBeTruthy();
  });
});
