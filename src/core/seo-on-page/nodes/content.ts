import type { BodyImage, LinkRef } from '../../links/rewrite';
import type { PageImage, PageLink } from '../tree/types';

/**
 * Clave bajo la que el loader guarda estos datos en `rendered.metadata` de cada entrada, junto a
 * los encabezados; el adaptador del panel los lee de ahí.
 */
export const CONTENT_METADATA_KEY = 'docsContent';

/**
 * Lo que el cuerpo de una página dice de sí mismo para el análisis: a qué OTRAS páginas enlaza y
 * qué imágenes lleva. Sale de lo que `rewriteLinks` ya detecta al cargar el contenido (una sola
 * regla para «qué es un enlace o una imagen»), sin volver a leer el Markdown.
 */
export function contentFacts(
  refs: readonly LinkRef[],
  images: readonly BodyImage[],
  own: { slug: string; locale: string },
): { links: PageLink[]; images: PageImage[] } {
  const seen = new Set<string>();
  const links: PageLink[] = [];
  for (const { slug, locale } of refs) {
    // Un ancla de la propia página (`[x](#intro)`) llega como ref a sí misma: no es un enlace saliente.
    if (slug === own.slug && locale === own.locale) continue;
    const key = `${slug}\u0000${locale}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ slug, locale });
  }
  return {
    links,
    images: images.map(({ src, alt }) => ({ src, alt: alt.trim() })),
  };
}
