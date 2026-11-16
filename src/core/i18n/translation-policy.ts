import type { ResolvedConfig } from '../config/resolve';
import type { Page } from '../content/discovery';
import { DocsError } from '../errors';
import type { SidebarLeaf } from '../navigation/sidebar';
import { pageUrl, type Availability, type UrlPolicy } from './availability';
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

/** Lo que las políticas necesitan de la config: los idiomas del sitio y el que va sin prefijo. */
type LocaleConfig = Pick<ResolvedConfig, 'locales' | 'defaultLocale'>;

/**
 * Hoja de barra lateral de un idioma sin traducción: `link` → hacia el original con la insignia de
 * su idioma, `fallback` → hacia la ruta de reserva del idioma y `omit` → ninguna.
 */
export function missingEntry(
  slug: string,
  title: string,
  available: Partial<Record<Locale, string>>,
  locale: Locale,
  policy: MissingTranslation,
  cfg: LocaleConfig,
  url: UrlPolicy,
): SidebarLeaf | null {
  switch (policy) {
    case MissingTranslation.LINK: {
      const source = sourceLocale(available, cfg.locales, cfg.defaultLocale);
      return {
        label: title,
        slug,
        href: available[source] ?? pageUrl(slug, source, url),
        badge: source,
      };
    }
    case MissingTranslation.FALLBACK:
      return { label: title, slug, href: pageUrl(slug, locale, url) };
    case MissingTranslation.OMIT:
      return null;
  }
}

/** Ruta que sirve el contenido original en un idioma sin traducción (política `fallback`). */
export interface RouteSpec {
  slug: string;
  locale: Locale;
  isFallback: true;
  /** Idioma del contenido que se sirve (el de origen), distinto del de la ruta. */
  entryMeta: { locale: Locale };
  /** URL (con base) del original: `buildHead` la hace absoluta para el `canonical`. */
  canonical: string;
}

/**
 * Rutas de reserva: una por cada idioma ausente de los grupos con política `fallback`. No entran en
 * `Availability` (no son traducciones), que se queda con las páginas reales.
 */
export function fallbackRoutes(
  av: Availability,
  policies: TranslationPolicies,
  cfg: LocaleConfig,
  url: UrlPolicy,
): RouteSpec[] {
  const routes: RouteSpec[] = [];
  for (const [slug, available] of av) {
    if (policies.get(slug) !== MissingTranslation.FALLBACK) continue;
    const source = sourceLocale(available, cfg.locales, cfg.defaultLocale);
    for (const locale of cfg.locales) {
      if (locale in available) continue;
      routes.push({
        slug,
        locale,
        isFallback: true,
        entryMeta: { locale: source },
        canonical: available[source] ?? pageUrl(slug, source, url),
      });
    }
  }
  return routes;
}
