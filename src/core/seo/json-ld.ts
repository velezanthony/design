import type { JsonLd } from '../config/schema';

/** De dónde sale un schema: la config del sitio o el frontmatter (`external[].seo`) de la página. */
export type SchemaSource = 'site' | 'page';

export interface ResolvedSchema {
  schema: JsonLd;
  source: SchemaSource;
}

const SCHEMA_ORG = 'https://schema.org';

/**
 * Completa `@context` con `https://schema.org` SOLO si falta (y lo pone el primero, como se
 * escribe a mano). Es sintaxis, no contenido: casi todo JSON-LD lo lleva y olvidarlo hace que el
 * bloque no valga para nada. Si el sitio declara el suyo, se respeta tal cual.
 */
export function withContext(schema: JsonLd): JsonLd {
  return '@context' in schema ? schema : { '@context': SCHEMA_ORG, ...schema };
}

/**
 * Cascada de schemas, la misma que la de los títulos: página `false` -> ninguno; lista -> los del
 * sitio y después los de la página; ausente -> los del sitio; nada en ningún nivel -> nada. La
 * usan `buildHead` y el árbol del panel, así que lo que se inspecciona es lo que se publica.
 */
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

/* `<` evita `</script>` y `<!--`; `>` y `&` no son peligrosos dentro de un <script> pero se
   escapan por higiene; U+2028/2029 son saltos de línea en JavaScript y rompen el literal si el
   JSON se evalúa. Todos son escapes JSON válidos: `JSON.parse` devuelve el mismo valor. */
const UNSAFE: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * JSON listo para ir DENTRO de un `<script type="application/ld+json">`. El contenido de un
 * `<script>` es texto crudo: no se escapa como HTML (`&amp;` rompería el JSON), así que el
 * escapado se hace aquí, una sola vez, y quien lo pinta lo inserta tal cual (`set:html`).
 */
export function serializeJsonLd(schema: JsonLd): string {
  return JSON.stringify(schema).replace(/[<>&\u2028\u2029]/g, (char) => UNSAFE[char] ?? char);
}
