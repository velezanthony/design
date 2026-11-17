import { z } from 'astro/zod';
import { MissingTranslationSchema, PageSeoOverrideSchema } from '../../core/config/schema';

/**
 * Esquema de la colección `docs`. Los metadatos que necesita el núcleo: slug (vacío para la
 * portada), idioma, título y ruta del archivo fuente (relativa a la raíz del proyecto), más lo
 * que cada página puede declarar: `order`, `seo` y `translations` (frontmatter o `external[]`).
 * `editPath` es la ruta relativa al repositorio para el enlace «Editar» (solo con `editUrl`).
 */
export function docsSchema() {
  return z.object({
    slug: z.string(),
    locale: z.string(),
    title: z.string(),
    sourcePath: z.string(),
    /** De dónde viene la página: un `.md` de `content` o una entrada de `external[]` (su seo y sus traducciones viven en docs.config.mjs, no en un frontmatter). */
    kind: z.enum(['native', 'external']).default('native'),
    order: z.number().optional(),
    seo: PageSeoOverrideSchema.optional(),
    translations: MissingTranslationSchema.optional(),
    editPath: z.string().optional(),
  });
}
