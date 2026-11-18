import { pageUrl, type Availability, type UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { PRIVACY_LOCALES, hasPrivacyCopy } from './copy';

/** Ruta de la página de privacidad por idioma: las mismas que usa el portfolio. */
const SLUGS: Readonly<Record<(typeof PRIVACY_LOCALES)[number], string>> = {
  es: 'privacidad',
  en: 'privacy',
};

/** Clave interna de la página en `Availability`; no es un slug de contenido. */
const AVAILABILITY_KEY = '__privacy__';

/** Slug de la página en un idioma. Lanza si ese idioma no tiene texto. */
export function privacySlug(locale: Locale): string {
  if (!hasPrivacyCopy(locale)) {
    throw new Error(
      `No hay página de privacidad en «${locale}» (disponibles: ${PRIVACY_LOCALES.join(', ')}).`,
    );
  }
  return SLUGS[locale as keyof typeof SLUGS];
}

/** Idiomas de la lista que no tienen texto de privacidad, en su orden. */
export function missingPrivacyLocales(locales: readonly Locale[]): Locale[] {
  return locales.filter((locale) => !hasPrivacyCopy(locale));
}

/** URL (con base) de la página en cada idioma, bajo la política de URLs del sitio. */
export function privacyPageUrls(
  locales: readonly Locale[],
  url: UrlPolicy,
): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [locale, pageUrl(privacySlug(locale), locale, url)]),
  );
}

/** La página como una entrada de disponibilidad: de ahí salen el hreflang, el selector y el sitemap. */
export function privacyAvailability(locales: readonly Locale[], url: UrlPolicy): Availability {
  return new Map([[AVAILABILITY_KEY, privacyPageUrls(locales, url)]]);
}

/**
 * Parámetros de `getStaticPaths`: `main` es el idioma por defecto (`/[privacy]`, sin prefijo) y
 * `localized` los demás (`/[locale]/[privacy]`).
 */
export function privacyRoutes(locales: readonly Locale[], defaultLocale: Locale) {
  return {
    main: [{ params: { privacy: privacySlug(defaultLocale) } }],
    localized: locales
      .filter((locale) => locale !== defaultLocale)
      .map((locale) => ({ params: { locale, privacy: privacySlug(locale) } })),
  };
}

/** Fecha ISO escrita en el idioma de la página («17 de noviembre de 2026», «17 November 2026»). */
export function formatPrivacyDate(locale: Locale, iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}
