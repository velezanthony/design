/* Portadas de las entradas de un listado: lo que guarda el loader, lo que decide la política del
   listado y el dibujo de la portada de la librería. */

/** Portada guardada de una página: `false` (sin imagen), `'missing'` (la ruta no existe: va la de la librería), una imagen procesada (`asset`) o una de `public/` (`src`). */
export type StoredCover = false | 'missing' | { asset: unknown } | { src: string };

/** Lo que se pinta como portada de una entrada. */
export type EntryCover =
  | { kind: 'none' }
  | { kind: 'placeholder' }
  | { kind: 'image'; source: { asset: unknown } | { src: string }; alt: string };

/** Portada de una entrada: lo de la página manda (imagen, `false` o una ruta que falta → la de la librería); sin nada, la política del listado (`true`: la de la librería). Sin `imageAlt`, decorativa. */
export function coverFor(
  stored: StoredCover | undefined,
  policy: boolean,
  imageAlt?: string,
): EntryCover {
  if (stored === false) return { kind: 'none' };
  if (stored === 'missing') return { kind: 'placeholder' };
  if (stored !== undefined) return { kind: 'image', source: stored, alt: imageAlt ?? '' };
  return policy ? { kind: 'placeholder' } : { kind: 'none' };
}

/** Dibujo de la portada de la librería. */
export type CoverPattern = 'grid' | 'diagonal' | 'dots';

const PATTERNS: readonly CoverPattern[] = ['grid', 'diagonal', 'dots'];

/** El dibujo de una página: estable (sale de su slug), así no cambia al moverse de página. */
export function coverPattern(slug: string): CoverPattern {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PATTERNS[hash % PATTERNS.length]!;
}

/** Portada como la pinta el componente: la imagen ya es una URL. */
export type CoverView =
  { kind: 'none' } | { kind: 'placeholder' } | { kind: 'image'; src: string; alt: string };
