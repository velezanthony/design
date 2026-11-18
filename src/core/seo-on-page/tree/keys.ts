import type { ResolvedSchema } from '../../seo/json-ld';

/** La clave de una página en un idioma; `\u0000` no aparece en ningún slug ni idioma. */
export function pageKey(page: { slug: string; locale: string }): string {
  return `${page.slug}\u0000${page.locale}`;
}

/** Las páginas distintas de unas entradas: una página en dos idiomas es una sola. */
export function slugsOf(entries: readonly { slug: string }[]): Set<string> {
  return new Set(entries.map((entry) => entry.slug));
}

/** Los `@type` de unos schemas, sin repetir (un `@type` puede ser una lista). */
export function schemaTypes(schemas: readonly ResolvedSchema[]): string[] {
  return [...new Set(schemas.flatMap(({ schema }) => [schema['@type']].flat()))] as string[];
}
