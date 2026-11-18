import { getCollection, render } from 'astro:content';
import type { DocEntryData } from '../loader/schema';

/** Una entrada de la colección `docs` tal como la deja el loader. */
export interface DocsEntry {
  id: string;
  data: DocEntryData;
}

/** La colección `docs` la declara el consumidor, así que `astro:content` no conoce su nombre; este es el único punto donde se asume. */
export function getDocs() {
  return (getCollection as unknown as (name: 'docs') => Promise<DocsEntry[]>)('docs');
}

/** `render` con el mismo motivo: acepta una entrada de `docs` aunque el tipo del paquete no la conozca. */
export function renderDoc(entry: DocsEntry) {
  return (render as unknown as (entry: DocsEntry) => ReturnType<typeof render>)(entry);
}

/** Solo los datos de cada entrada: lo que piden las vistas. */
export async function getDocData(): Promise<DocEntryData[]> {
  return (await getDocs()).map((entry) => entry.data);
}
