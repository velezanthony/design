import type { BodyImage, LinkRef } from '../../links/rewrite';
import type { PageImage, PageLink } from '../tree/types';
import { pageKey } from '../tree/keys';

/** Clave de `rendered.metadata` donde el loader guarda estos datos; el adaptador del panel los lee de ahí. */
export const CONTENT_METADATA_KEY = 'docsContent';

/** Enlaces e imágenes del cuerpo tal como los detecta `rewriteLinks`, sin releer el Markdown. */
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
    const key = pageKey({ slug, locale });
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ slug, locale });
  }
  return {
    links,
    images: images.map(({ src, alt }) => ({ src, alt: alt.trim() })),
  };
}
