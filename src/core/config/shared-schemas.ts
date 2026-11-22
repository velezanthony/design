import { z } from 'astro/zod';
import { MissingTranslation } from '../i18n/translation-policy';

/* Piezas de esquema que comparten varios grupos de la config (`site`, `i18n`, `content`) y el
   frontmatter: textos traducibles, imágenes, JSON-LD y el `seo` de una página. */

/* Texto traducible: una cadena para todos los idiomas o una por idioma. */
export const LabelSchema = z.union([z.string(), z.record(z.string(), z.string())]);
export type Label = z.infer<typeof LabelSchema>;

/* Una imagen vive en `public/` (ruta absoluta del sitio) o es una URL https. */
export const ImageSrcSchema = z
  .string()
  .regex(/^(\/(?!\/)|https:\/\/)/, 'Debe ser una ruta de `public/` (/og.png) o una URL https.');

/** Valores permitidos de `MissingTranslation` como esquema: zod los lista en el mensaje de error. */
export const MissingTranslationSchema = z.enum(Object.values(MissingTranslation));

/** Sufijo del `<title>`: texto (o uno por idioma), o `false` para no llevar ninguno. */
export const TitleSuffixSchema = z.union([LabelSchema, z.literal(false)]);

/** Rutas (dentro del valor) de lo que `JSON.stringify` perdería o rompería: funciones, símbolos, bigint, NaN/Infinity. */
function nonJsonPaths(value: unknown, path: (string | number)[] = []): (string | number)[][] {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return [path];
  }
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [path];
  if (Array.isArray(value))
    return value.flatMap((item, index) => nonJsonPaths(item, [...path, index]));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => nonJsonPaths(item, [...path, key]));
  }
  return [];
}

/* Nodo JSON-LD: `@type` más propiedades abiertas, y el error de `@type` lleva su ruta en vez de un «Invalid input». */
export const JsonLdSchema = z
  .looseObject({
    '@type': z.union([z.string().min(1), z.array(z.string().min(1)).min(1)], {
      error: 'Debe ser un string o una lista no vacía de strings (por ejemplo "Person").',
    }),
  })
  .superRefine((node, context) => {
    for (const path of nonJsonPaths(node)) {
      context.addIssue({
        code: 'custom',
        path,
        message:
          'Debe ser un valor JSON (texto, número, booleano, null, lista u objeto): la config viaja al sitio como JSON.',
      });
    }
  });
export type JsonLd = z.infer<typeof JsonLdSchema>;

/* `lista | false` sin `z.union`: con una unión zod colapsa los fallos de cada rama en un «Invalid
   input» sin ruta, y justo ahí (`seo.schema[1]['@type']`) está lo que el usuario necesita leer. */
export const PageSchemasSchema = z.any().superRefine((value, context) => {
  if (value === false) return;
  if (!Array.isArray(value)) {
    context.addIssue({ code: 'custom', message: 'Debe ser una lista de schemas o `false`.' });
    return;
  }
  const parsed = z.array(JsonLdSchema).safeParse(value);
  if (parsed.success) return;
  for (const { path, message } of parsed.error.issues) {
    context.addIssue({ code: 'custom', path, message });
  }
}) as unknown as z.ZodType<JsonLd[] | false, JsonLd[] | false>;

/** Override de SEO de una página: frontmatter `seo` (nativas) o `external[].seo` (externas). */
export const PageSeoOverrideSchema = z.strictObject({
  title: LabelSchema.optional(),
  titleSuffix: TitleSuffixSchema.optional(),
  description: LabelSchema.optional(),
  image: z.strictObject({ src: ImageSrcSchema, alt: LabelSchema.optional() }).optional(),
  noindex: z.boolean().optional(),
  /** Lista que se SUMA a la del sitio, o `false` para que la página no lleve ninguno. */
  schema: PageSchemasSchema.optional(),
});
export type PageSeoOverride = z.infer<typeof PageSeoOverrideSchema>;
