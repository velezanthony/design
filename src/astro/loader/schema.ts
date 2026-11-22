import { z } from 'astro/zod';
import { MissingTranslationSchema, PageSeoOverrideSchema } from '../../core/config/schema';

/** El `image()` que Astro pasa a un `schema` en forma de función: convierte una ruta relativa al `.md` en una imagen de `astro:assets`. */
export type ImageHelper = () => z.ZodType;

/** Portada guardada (`StoredCover`): sin imagen, ruta que falta, imagen procesada o de `public/`. */
function coverSchema(image?: ImageHelper) {
  return z.union([
    z.literal(false),
    z.literal('missing'),
    z.object({ asset: image ? image() : z.string() }),
    z.object({ src: z.string() }),
  ]);
}

/**
 * Esquema de la colección `docs`: lo que necesita el núcleo más `order`, `seo`, `translations`,
 * `editPath` (solo con `editUrl`) y la ficha de los listados (`index`). Con el `image` de
 * `schema: ({ image }) => docsSchema(image)`, la portada relativa de una página pasa por
 * `astro:assets`; sin él (`docsSchema()`) se queda en una ruta y el índice pone la de la librería.
 */
export function docsSchema(image?: ImageHelper) {
  return z.object({
    /** Identidad: el archivo sin sufijo de idioma; empareja las traducciones. */
    slug: z.string(),
    /** URL propia sin idioma ni base (el `slug` del frontmatter); sin ella, la de `slug`. */
    urlSlug: z.string().optional(),
    locale: z.string(),
    title: z.string(),
    sourcePath: z.string(),
    /** De dónde viene la página: un `.md` de `content`, una entrada de `external[]` (su seo y sus traducciones viven en docs.config.mjs, no en un frontmatter) o un índice generado. */
    kind: z.enum(['native', 'external', 'generated']).default('native'),
    order: z.number().optional(),
    seo: PageSeoOverrideSchema.optional(),
    translations: MissingTranslationSchema.optional(),
    editPath: z.string().optional(),
    /** Cómo sale en un listado: resumen y portada ya comprobada, con su texto alternativo. */
    index: z
      .object({
        summary: z.string().optional(),
        imageAlt: z.string().optional(),
        cover: coverSchema(image).optional(),
      })
      .optional(),
  });
}

/** Los datos de una página como los reciben las vistas: `kind` es opcional por su `default`. */
export type DocData = z.input<ReturnType<typeof docsSchema>>;

/** Los datos de una página como los guarda la colección, con los valores por defecto. */
export type DocEntryData = z.output<ReturnType<typeof docsSchema>>;
