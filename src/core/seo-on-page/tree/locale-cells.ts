import type { Locale } from '../../i18n/locale';
import type { SeoLocaleEntry } from './types';

/** `missing`: sin fichero y la política enlaza al original; `fallback`: otro idioma bajo su ruta; `omit`: omitida a propósito. */
export type MatrixState = 'exists' | 'missing' | 'fallback' | 'omitted';

export interface LocaleCell {
  locale: Locale;
  state: MatrixState;
}

/** Cómo está la página en cada idioma configurado, en el orden de la config. Lo lee de `entry.locales`. */
export function localeCells(
  group: readonly SeoLocaleEntry[],
  locales: readonly Locale[],
): LocaleCell[] {
  return locales.map((locale) => {
    const found = group.find((entry) => entry.locale === locale);
    if (found?.status === 'present') return { locale, state: 'exists' as const };
    if (found?.status !== 'missing') return { locale, state: 'missing' as const };
    const state = { link: 'missing', fallback: 'fallback', omit: 'omitted' } as const;
    return { locale, state: state[found.policy] };
  });
}
