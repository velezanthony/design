import { describe, expect, it } from 'vitest';
import { clientTag } from './key-place';

describe('clientTag', () => {
  it.each([
    ['seo.title', '<title>'],
    ['seo.description', '<meta name="description">'],
    ['seo.image', 'og:image'],
    ['seo.image.src', 'og:image'],
    ['seo.schema', '<script type="application/ld+json">'],
    ['seo.noindex', '<meta name="robots">'],
  ])('«%s» de un .md es %s en el <head> de una página Astro', (key, tag) => {
    expect(clientTag(key)).toBe(tag);
  });

  it('una clave sin etiqueta equivalente se deja como está', () => {
    expect(clientTag('translations')).toBe('translations');
  });
});
