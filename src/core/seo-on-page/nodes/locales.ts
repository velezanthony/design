import type { Locale } from '../../i18n/locale';
import type { MissingTranslation } from '../../i18n/translation-policy';
import type { SeoLocaleEntry } from '../tree/types';

/** `available` es el mapa de `buildAvailability`, misma fuente que el selector de idioma y el hreflang. */
export function buildLocaleEntries(
  available: Partial<Record<Locale, string>>,
  locales: Locale[],
  policy: MissingTranslation,
  isDeclared: (locale: Locale) => boolean,
): SeoLocaleEntry[] {
  return locales.map((locale) => {
    const url = available[locale];
    return url === undefined
      ? { locale, status: 'missing', policy, declared: isDeclared(locale) }
      : { locale, status: 'present', url };
  });
}
