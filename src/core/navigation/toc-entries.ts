/** Un encabezado tal como lo da Astro al renderizar el Markdown. */
export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

/** Por debajo de esto el índice no orienta: se lee la página entera de un vistazo. */
const MIN_ENTRIES = 3;

/**
 * Las entradas del índice «En esta página»: los H2 y H3 (el H1 es el título y los H4 serían
 * ruido), y ninguna si no llegan a tres. Es LA regla: la usan el índice para pintarse y el layout
 * para no reservarle columna cuando no hay índice.
 */
export function tocEntries<T extends TocHeading>(headings: readonly T[]): T[] {
  const entries = headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
  return entries.length >= MIN_ENTRIES ? entries : [];
}
