/**
 * Filas por página por defecto. 25 son unas dos pantallas con las insignias de problemas: se
 * escanea de una vez y la página sigue siendo ligera (cada fila pinta varias insignias), sin
 * obligar a pasar de página para ver un grupo corto. Quien quiera otro tamaño lo elige entre
 * `PAGE_SIZES`; este es el que rige si la URL no dice nada.
 */
export const PAGE_SIZE = 25;

/** Tamaños elegibles. Cerrados a propósito: una URL con un número cualquiera no pide una página gigante. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;

export interface Paginated<T> {
  rows: T[];
  /** Página efectiva, ya acotada a [1, pages]. */
  page: number;
  pages: number;
  total: number;
  /** Posición (1-based) de la primera y la última fila de la página; 0 y 0 si no hay filas. */
  from: number;
  to: number;
}

/**
 * Un trozo de `items`. La página pedida viene de una URL que puede haber escrito cualquiera, así
 * que lo que no vale (0, negativa, decimal, NaN, pasada del final) se lleva a la página válida más
 * cercana en vez de fallar o enseñar una tabla vacía. Sin filas hay una sola página.
 */
export function paginate<T>(items: readonly T[], page: number, size: number): Paginated<T> {
  const perPage = Number.isFinite(size) && size >= 1 ? Math.floor(size) : 1;
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const wanted = Number.isNaN(page) ? 1 : Math.trunc(page);
  const current = Math.min(Math.max(wanted, 1), pages);
  const start = (current - 1) * perPage;
  const rows = items.slice(start, start + perPage);
  return {
    rows,
    page: current,
    pages,
    total,
    from: rows.length === 0 ? 0 : start + 1,
    to: start + rows.length,
  };
}
