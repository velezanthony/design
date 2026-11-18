/** Hueco entre números de página no contiguos: la interfaz lo pinta como «…». */
export const GAP = 'gap';

export type PageWindowItem = number | typeof GAP;

/** Hasta aquí se enseñan todas las páginas; con más, se condensa. */
const SHOW_ALL_UP_TO = 7;

/** Números de página a enseñar y dónde van los huecos; pura y genérica, no sabe qué se pagina. */
export function pageWindow(page: number, pages: number): PageWindowItem[] {
  const numbers =
    pages <= SHOW_ALL_UP_TO
      ? Array.from({ length: Math.max(pages, 0) }, (_item, index) => index + 1)
      : [...new Set([1, page - 1, page, page + 1, pages])]
          .filter((number) => number >= 1 && number <= pages)
          .sort((left, right) => left - right);
  return numbers.flatMap((number, index): PageWindowItem[] =>
    index > 0 && number - numbers[index - 1]! > 1 ? [GAP, number] : [number],
  );
}
