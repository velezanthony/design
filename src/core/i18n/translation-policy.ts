import type { ResolvedConfig } from '../config/resolve';
import type { Page } from '../content/discovery';
import { urlSlugOf } from '../content/slug';
import { DocsError } from '../errors';
import { pageUrl, type Availability, type UrlPolicy } from './availability';
import type { Locale } from './locale';

/** Qué hace un idioma cuando una página no tiene traducción. Mismas cadenas en config y YAML. */
export const MissingTranslation = { LINK: 'link', OMIT: 'omit', FALLBACK: 'fallback' } as const;
export type MissingTranslation = (typeof MissingTranslation)[keyof typeof MissingTranslation];

/** Política efectiva por grupo de traducción (la identidad de sus páginas, `Page.slug`). */
export type TranslationPolicies = Map<string, MissingTranslation>;

function groupBySlug(pages: Page[]): Map<string, Page[]> {
  const groups = new Map<string, Page[]>();
  for (const page of pages) groups.set(page.slug, [...(groups.get(page.slug) ?? []), page]);
  return groups;
}

/** Política de cada grupo: la declarada por alguna página o la base; dos valores distintos en un grupo es un error. */
export function resolvePolicies(
  pages: Page[],
  base: MissingTranslation,
): { policies: TranslationPolicies; errors: DocsError[] } {
  const policies: TranslationPolicies = new Map();
  const errors: DocsError[] = [];
  for (const [slug, group] of groupBySlug(pages)) {
    const declared = group.filter((page) => page.translations !== undefined);
    const [first] = declared;
    const conflicting = declared.find((page) => page.translations !== first?.translations);
    if (first && conflicting) {
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

/** Idioma que se enlaza o sirve: el por defecto si el grupo lo tiene y si no el primero de `locales` presente. */
export function sourceLocale(
  available: Partial<Record<Locale, string>>,
  locales: Locale[],
  defaultLocale: Locale,
): Locale {
  if (defaultLocale in available) return defaultLocale;
  return locales.find((locale) => locale in available) ?? defaultLocale;
}

/** La versión de `slug` en `locale` o, sin esa traducción, la del original que elige `sourceLocale`. Vale para cualquier lista con identidad e idioma (páginas del núcleo o datos de la colección). */
export function pickLocalized<T extends { slug: string; locale: Locale }>(
  items: readonly T[],
  slug: string,
  locale: Locale,
  config: { locales: Locale[]; defaultLocale: Locale },
): T | undefined {
  const group = items.filter((item) => item.slug === slug);
  const own = group.find((item) => item.locale === locale);
  if (own) return own;
  const available = Object.fromEntries(group.map((item) => [item.locale, item.locale]));
  const source = sourceLocale(available, config.locales, config.defaultLocale);
  return group.find((item) => item.locale === source);
}

/** Grupos incompletos sin `translations` declarado (traducciones quizá olvidadas); un sitio monolingüe, o uno con política en su config, no devuelve nada. */
export function undeclaredMissing(
  pages: Page[],
  locales: Locale[],
  siteDeclared = false,
): { slug: string; missing: Locale[] }[] {
  if (locales.length <= 1 || siteDeclared) return [];
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

/** Ruta que sirve el contenido original en un idioma sin traducción (política `fallback`). */
export interface RouteSpec {
  /** Identidad del grupo. */
  slug: string;
  /** URL de la reserva sin idioma ni base: la del original (su `slug` propio, si lo tiene). */
  urlSlug: string;
  locale: Locale;
  isFallback: true;
  /** Idioma del contenido que se sirve (el de origen), distinto del de la ruta. */
  entryMeta: { locale: Locale };
  /** URL (con base) del original: `buildHead` la hace absoluta para el `canonical`. */
  canonical: string;
}

/** Rutas de reserva por idioma ausente en grupos `fallback`; no entran en `Availability` porque no son traducciones. */
export function fallbackRoutes({
  availability,
  policies,
  config,
  url,
  pages,
}: {
  availability: Availability;
  policies: TranslationPolicies;
  config: LocaleConfig;
  url: UrlPolicy;
  /** Las páginas reales: de la del original sale el `slug` propio que la reserva reutiliza. */
  pages: readonly Page[];
}): RouteSpec[] {
  const routes: RouteSpec[] = [];
  for (const [slug, available] of availability) {
    if (policies.get(slug) !== MissingTranslation.FALLBACK) continue;
    const source = sourceLocale(available, config.locales, config.defaultLocale);
    const original = pages.find((page) => page.slug === slug && page.locale === source);
    const urlSlug = original ? urlSlugOf(original) : slug;
    for (const locale of config.locales) {
      if (locale in available) continue;
      routes.push({
        slug,
        urlSlug,
        locale,
        isFallback: true,
        entryMeta: { locale: source },
        canonical: available[source] ?? pageUrl(urlSlug, source, url),
      });
    }
  }
  return routes;
}
