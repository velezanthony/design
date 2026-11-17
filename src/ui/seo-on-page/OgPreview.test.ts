import { describe, expect, it } from 'vitest';
import { render, text } from '../../testing/render';
import OgPreview from './OgPreview.astro';

const props = (extra: Record<string, unknown> = {}) => ({
  title: 'Guide',
  description: 'A description.',
  host: 'x.dev',
  image: { src: '/repo/og.png', alt: 'Card', width: 1200, height: 630 },
  ...extra,
});

describe('OgPreview', () => {
  it('pinta la imagen con su alt, el dominio, el título y la descripción', async () => {
    const doc = await render(OgPreview, props());
    const img = doc.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/repo/og.png');
    expect(img.getAttribute('alt')).toBe('Card');
    expect(text(doc)).toContain('x.dev');
    expect(text(doc)).toContain('Guide');
    expect(text(doc)).toContain('A description.');
  });

  it('sin imagen lo dice en vez de dejar un hueco', async () => {
    const doc = await render(OgPreview, props({ image: undefined }));
    expect(doc.querySelector('img')).toBeNull();
    expect(text(doc)).toContain('Sin imagen');
  });
});
