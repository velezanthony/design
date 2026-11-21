/* La única matemática de páginas: la usan el panel SEO y los índices generados. */

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

/** Un tamaño no válido (0, negativo, `NaN`) se trata como 1 en vez de dividir por cero. */
function sizeOf(size: number): number {
  return Number.isFinite(size) && size >= 1 ? Math.floor(size) : 1;
}

/** Páginas de `total` filas de `size` en `size`: al menos una, también sin filas. */
export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / sizeOf(size)));
}

/** La página viene de una URL editable: lo inválido se acota a la válida más cercana; sin filas hay una página. */
export function paginate<T>(items: readonly T[], page: number, size: number): Paginated<T> {
  const perPage = sizeOf(size);
  const total = items.length;
  const pages = pageCount(total, perPage);
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
