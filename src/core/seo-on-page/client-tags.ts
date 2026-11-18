/** Cada clave de frontmatter de un `.md` y la etiqueta del `<head>` que hace lo mismo en un `.astro`. */
const TAGS: Record<string, string> = {
  'seo.title': '<title>',
  'seo.description': '<meta name="description">',
  'seo.image': 'og:image',
  'seo.image.src': 'og:image',
  'seo.schema': '<script type="application/ld+json">',
  'seo.noindex': '<meta name="robots">',
};

/**
 * Lo que en una página del cliente (`src/pages/*.astro`) hace lo que la clave en un `.md`: no hay
 * frontmatter, así que el arreglo y el informe nombran la etiqueta. Una clave sin equivalente se
 * deja tal cual.
 */
export const clientTag = (key: string): string => TAGS[key] ?? key;
