import { getCollection, render } from 'astro:content';
import type { z } from 'astro/zod';
import type { docsSchema } from '../loader/schema';

/** Una entrada de la colección `docs` tal como la deja el loader. */
export interface DocsEntry {
  id: string;
  data: z.infer<ReturnType<typeof docsSchema>>;
}

/**
 * La colección `docs` la declara el `content.config.ts` del CONSUMIDOR, así que dentro del paquete
 * `astro:content` no conoce su nombre (el tipo de `getCollection` queda en `never`). Este es el
 * único punto donde se asume: los contenedores piden las entradas aquí, ya tipadas.
 */
export const getDocs = () =>
  (getCollection as unknown as (name: 'docs') => Promise<DocsEntry[]>)('docs');

/** `render` con el mismo motivo: acepta una entrada de `docs` aunque el tipo del paquete no la conozca. */
export const renderDoc = (entry: DocsEntry) =>
  (render as unknown as (entry: DocsEntry) => ReturnType<typeof render>)(entry);
