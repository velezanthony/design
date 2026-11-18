import type { SeoPageKind } from './tree/types';

/** Cada clave de frontmatter de un `.md` y la etiqueta del `<head>` que hace lo mismo en un `.astro`. */
const TAGS: Record<string, string> = {
  'seo.title': '<title>',
  'seo.description': '<meta name="description">',
  'seo.image': 'og:image',
  'seo.image.src': 'og:image',
  'seo.schema': '<script type="application/ld+json">',
  'seo.noindex': '<meta name="robots">',
};

/** En un `.astro` no hay frontmatter: se nombra la etiqueta del `<head>`; sin equivalente, la clave. */
export function clientTag(key: string): string {
  return TAGS[key] ?? key;
}

/** Una clave tal como se escribe para un tipo de página: en `external[]`, o la etiqueta en un `.astro`. */
export function scopedKey(key: string, kind: SeoPageKind): string {
  if (kind === 'client') return clientTag(key);
  return kind === 'external' ? `external[].${key}` : key;
}

/** Dónde vive esa clave cuando la página no es un `.md` de la carpeta de contenido. */
export function keyPlace(kind: SeoPageKind): string {
  return kind === 'client' ? 'en su <head>' : 'en docs.config.mjs';
}
