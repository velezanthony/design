import type { Page } from '../content/discovery';
import { DocsError } from '../errors';
import type { Locale } from './locale';

/** Qué hace un idioma cuando una página no tiene traducción. Mismas cadenas en config y YAML. */
export const MissingTranslation = { LINK: 'link', OMIT: 'omit', FALLBACK: 'fallback' } as const;
export type MissingTranslation = (typeof MissingTranslation)[keyof typeof MissingTranslation];

/** Política efectiva por grupo de traducción (slug). */
export type TranslationPolicies = Map<string, MissingTranslation>;

function groupBySlug(pages: Page[]): Map<string, Page[]> {
  const groups = new Map<string, Page[]>();
  for (const page of pages) groups.set(page.slug, [...(groups.get(page.slug) ?? []), page]);
  return groups;
}

/**
 * Política efectiva de cada grupo: la declarada por alguna de sus páginas (frontmatter o
 * `external[].translations`) o, si ninguna la declara, la base. Dos archivos del mismo grupo con
 * valores distintos es un error que nombra ambos.
 */
export function resolvePolicies(
  pages: Page[],
  base: MissingTranslation,
): { policies: TranslationPolicies; errors: DocsError[] } {
  const policies: TranslationPolicies = new Map();
  const errors: DocsError[] = [];
  for (const [slug, group] of groupBySlug(pages)) {
    const declared = group.filter((page) => page.translations !== undefined);
    const conflicting = declared.find((page) => page.translations !== declared[0].translations);
    if (conflicting) {
      const first = declared[0];
      errors.push(
        new DocsError(
          `«${slug || '(portada)'}» declara políticas de traducción distintas: ${first.sourcePath} (${first.translations}) y ${conflicting.sourcePath} (${conflicting.translations}).`,
          {
            file: first.sourcePath,
            hint: 'Declara el mismo valor de `translations` en todo el grupo.',
          },
        ),
      );
      continue;
    }
    policies.set(slug, declared[0]?.translations ?? base);
  }
  return { policies, errors };
}

/**
 * Idioma cuyo contenido se enlaza o se sirve: el idioma por defecto si el grupo lo tiene y, si no,
 * el primero de `locales` que exista en el grupo.
 */
export function sourceLocale(
  available: Partial<Record<Locale, string>>,
  locales: Locale[],
  defaultLocale: Locale,
): Locale {
  if (defaultLocale in available) return defaultLocale;
  return locales.find((locale) => locale in available) ?? defaultLocale;
}

/**
 * Grupos incompletos en los que ningún archivo declara `translations`: son traducciones que quizá
 * se olvidaron. Declarar la política (aunque coincida con la base) los silencia. Un sitio de un
 * solo idioma nunca devuelve nada.
 */
export function undeclaredMissing(
  pages: Page[],
  locales: Locale[],
): { slug: string; missing: Locale[] }[] {
  if (locales.length <= 1) return [];
  const result: { slug: string; missing: Locale[] }[] = [];
  for (const [slug, group] of groupBySlug(pages)) {
    if (group.some((page) => page.translations !== undefined)) continue;
    const present = new Set(group.map((page) => page.locale));
    const missing = locales.filter((locale) => !present.has(locale));
    if (missing.length > 0) result.push({ slug, missing });
  }
  return result;
}
