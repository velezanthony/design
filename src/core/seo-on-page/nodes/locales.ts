import type { Locale } from '../../i18n/locale';
import type { MissingTranslation } from '../../i18n/translation-policy';
import type { SeoLocaleEntry } from '../tree/types';

/**
 * Una entrada por idioma configurado, en el orden de `locales`: su URL si la página existe en él o,
 * si no, la política que se le aplica y si alguien la declaró. `available` es el mapa de
 * `buildAvailability`, la misma fuente de verdad del selector de idioma y el hreflang.
 */
export function buildLocaleEntries(
  available: Partial<Record<Locale, string>>,
  locales: Locale[],
  policy: MissingTranslation,
  declared: boolean,
): SeoLocaleEntry[] {
  return locales.map((locale) => {
    const url = available[locale];
    return url === undefined
      ? { locale, status: 'missing', policy, declared }
      : { locale, status: 'present', url };
  });
}
