import { z } from 'astro/zod';
import { MissingTranslationSchema, PageSeoOverrideSchema } from '../../core/config/schema';

/** Esquema de la colección `docs`: lo que necesita el núcleo más `order`, `seo`, `translations` y `editPath` (solo con `editUrl`). */
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

/** Los datos de una página como los reciben las vistas: `kind` es opcional por su `default`. */
export type DocData = z.input<ReturnType<typeof docsSchema>>;

/** Los datos de una página como los guarda la colección, con los valores por defecto. */
export type DocEntryData = z.output<ReturnType<typeof docsSchema>>;
