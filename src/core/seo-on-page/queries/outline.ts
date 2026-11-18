import type { HeadingNode } from '../tree/types';

/** Un encabezado del esquema; `skipFrom` es el nivel del que viene si baja saltándose alguno. */
export interface OutlineItem extends HeadingNode {
  skipFrom?: number;
}

/** Única regla del salto, compartida por `analyzeHeadings` y el inspector; solo importa bajar de más. */
export function outline(headings: readonly HeadingNode[]): OutlineItem[] {
  return headings.map((heading, index) => {
    const previous = headings[index - 1];
    return previous && heading.depth > previous.depth + 1
      ? { ...heading, skipFrom: previous.depth }
      : { ...heading };
  });
}
