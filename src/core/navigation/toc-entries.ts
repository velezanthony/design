/** Un encabezado tal como lo da Astro al renderizar el Markdown. */
export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

/** Por debajo de esto el índice no orienta: se lee la página entera de un vistazo. */
const MIN_ENTRIES = 3;

/** El H1 es el título de la página, así que el índice empieza en H2; por defecto llega hasta H3. */
export const DEFAULT_TOC_DEPTH = 3;

/** Entradas de «En esta página»: de H2 a `maxDepth`, y ninguna si no llegan a tres; la regla la comparten el índice y el layout. */
export function tocEntries<T extends TocHeading>(
  headings: readonly T[],
  maxDepth: number = DEFAULT_TOC_DEPTH,
): T[] {
  const entries = headings.filter((heading) => heading.depth >= 2 && heading.depth <= maxDepth);
  return entries.length >= MIN_ENTRIES ? entries : [];
}
