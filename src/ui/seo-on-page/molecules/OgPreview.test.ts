import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import OgPreview from './OgPreview.astro';

function props(extra: Record<string, unknown> = {}) {
  return {
    title: 'Guide',
    description: 'A description.',
    host: 'x.dev',
    image: { src: '/repo/og.png', alt: 'Card', width: 1200, height: 630 },
    ...extra,
  };
}

describe('OgPreview', () => {
  it('pinta la imagen con su alt, el dominio, el título y la descripción', async () => {
    const htmlDocument = await render(OgPreview, props());
    const img = htmlDocument.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/repo/og.png');
    expect(img.getAttribute('alt')).toBe('Card');
    expect(text(htmlDocument)).toContain('x.dev');
    expect(text(htmlDocument)).toContain('Guide');
    expect(text(htmlDocument)).toContain('A description.');
  });

  it('sin imagen lo dice en vez de dejar un hueco', async () => {
    const htmlDocument = await render(OgPreview, props({ image: undefined }));
    expect(htmlDocument.querySelector('img')).toBeNull();
    expect(text(htmlDocument)).toContain('Sin imagen');
  });
});
