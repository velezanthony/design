/** Un encabezado tal como lo da Astro al renderizar el Markdown. */
export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

/** Por debajo de esto el índice no orienta: se lee la página entera de un vistazo. */
const MIN_ENTRIES = 3;

/** Entradas de «En esta página»: H2 y H3, y ninguna si no llegan a tres; la regla la comparten el índice y el layout. */
export function tocEntries<T extends TocHeading>(headings: readonly T[]): T[] {
  const entries = headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
  return entries.length >= MIN_ENTRIES ? entries : [];
}
