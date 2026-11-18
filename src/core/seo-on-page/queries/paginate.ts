/** 25 son unas dos pantallas con insignias; rige si la URL no dice nada (el resto, en `PAGE_SIZES`). */
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

/** La página viene de una URL editable: lo inválido se acota a la válida más cercana; sin filas hay una página. */
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
