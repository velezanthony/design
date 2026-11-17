/** Hueco entre números de página no contiguos: la interfaz lo pinta como «…». */
export const GAP = 'gap';

export type PageWindowItem = number | typeof GAP;

/** Hasta aquí se enseñan todas las páginas; con más, se condensa. */
const SHOW_ALL_UP_TO = 7;

/**
 * Qué números de página enseñar en una paginación y dónde van los huecos. Con pocas páginas, todas;
 * con muchas, la primera, la última y las vecinas de la actual (los extremos se pegan a su lado, sin
 * repetir), y entre dos números no contiguos, un hueco. Pura y genérica: no sabe de qué se pagina ni
 * cómo se pinta, así la conoce cualquier lista paginada.
 */
export function pageWindow(page: number, pages: number): PageWindowItem[] {
  const numbers =
    pages <= SHOW_ALL_UP_TO
      ? Array.from({ length: Math.max(pages, 0) }, (_, index) => index + 1)
      : [...new Set([1, page - 1, page, page + 1, pages])]
          .filter((number) => number >= 1 && number <= pages)
          .sort((a, b) => a - b);
  return numbers.flatMap((number, index): PageWindowItem[] =>
    index > 0 && number - numbers[index - 1]! > 1 ? [GAP, number] : [number],
  );
}
