import { z } from 'astro/zod';

/**
 * Esquema de la colección `docs`. Los metadatos que necesita el núcleo: slug (vacío para la
 * portada), idioma, título y ruta del archivo fuente (relativa a la raíz del proyecto).
 */
export function docsSchema() {
  return z.object({
    slug: z.string(),
    locale: z.string(),
    title: z.string(),
    sourcePath: z.string(),
    order: z.number().optional(),
  });
}
