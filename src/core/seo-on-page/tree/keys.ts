import type { ResolvedSchema } from '../../seo/json-ld';

/** La clave de una página en un idioma; `\u0000` no aparece en ningún slug ni idioma. */
export function pageKey(page: { slug: string; locale: string }): string {
  return `${page.slug}\u0000${page.locale}`;
}

/** Cómo se nombra una página en los textos: la portada no tiene slug y se dice «/». */
export function slugLabel(slug: string): string {
  return slug || '/';
}

/** La entrada de una página en un idioma. */
export function findEntry<Entry extends { slug: string; locale: string }>(
  entries: readonly Entry[],
  slug: string,
  locale: string,
): Entry | undefined {
  return entries.find((entry) => entry.slug === slug && entry.locale === locale);
}

/** Las páginas distintas de unas entradas: una página en dos idiomas es una sola. */
export function slugsOf(entries: readonly { slug: string }[]): Set<string> {
  return new Set(entries.map((entry) => entry.slug));
}

/** Los `@type` de unos schemas, sin repetir (un `@type` puede ser una lista). */
export function schemaTypes(schemas: readonly ResolvedSchema[]): string[] {
  return [...new Set(schemas.flatMap(({ schema }) => [schema['@type']].flat()))] as string[];
}
