import type { JsonLd } from '../config/schema';

/** De dónde sale un schema: la config del sitio o el frontmatter (`external[].seo`) de la página. */
export type SchemaSource = 'site' | 'page';

export interface ResolvedSchema {
  schema: JsonLd;
  source: SchemaSource;
}

const SCHEMA_ORG = 'https://schema.org';

/** Añade `@context` de schema.org solo si falta (y primero); si el sitio declara el suyo se respeta. */
export function withContext(schema: JsonLd): JsonLd {
  return '@context' in schema ? schema : { '@context': SCHEMA_ORG, ...schema };
}

/** Cascada de schemas como la de títulos: página `false` ninguno, lista sitio y página, ausente el del sitio. */
export function resolveSchemas(
  site: readonly JsonLd[] | undefined,
  page: readonly JsonLd[] | false | undefined,
): ResolvedSchema[] {
  if (page === false) return [];
  function tag(source: SchemaSource) {
    return (schema: JsonLd): ResolvedSchema => ({
      schema: withContext(schema),
      source,
    });
  }
  return [...(site ?? []).map(tag('site')), ...(page ?? []).map(tag('page'))];
}

/* `<` evita `</script>` y `<!--`; `>`, `&` y U+2028/2029 se escapan por higiene; son escapes JSON válidos. */
const UNSAFE: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/** JSON listo para DENTRO de un `<script type="application/ld+json">`: se escapa aquí una vez, no como HTML, y se inserta con `set:html`. */
export function serializeJsonLd(schema: JsonLd): string {
  return JSON.stringify(schema).replace(/[<>&\u2028\u2029]/g, (char) => UNSAFE[char] ?? char);
}
