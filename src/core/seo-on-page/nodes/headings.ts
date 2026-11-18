import type { HeadingNode } from '../tree/types';

/** Encabezados en el orden del documento. Copia para que el árbol no comparta objetos con Astro. */
export function buildHeadingNodes(headings: readonly HeadingNode[]): HeadingNode[] {
  return headings.map(({ depth, slug, text }) => ({ depth, slug, text }));
}
