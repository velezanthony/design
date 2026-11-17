import type { HeadingNode } from '../tree/types';

/** Un encabezado del esquema; `skipFrom` es el nivel del que viene si baja saltándose alguno. */
export interface OutlineItem extends HeadingNode {
  skipFrom?: number;
}

/**
 * Esquema de encabezados con los saltos de nivel marcados. Es LA regla del salto: la usan el
 * analizador (`analyzeHeadings`) y el inspector. Solo importa bajar de más; subir de H4 a H2 al
 * cerrar una sección es normal.
 */
export function outline(headings: readonly HeadingNode[]): OutlineItem[] {
  return headings.map((heading, index) => {
    const previous = headings[index - 1];
    return previous && heading.depth > previous.depth + 1
      ? { ...heading, skipFrom: previous.depth }
      : { ...heading };
  });
}
