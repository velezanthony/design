import type { Label } from '../config/schema';
import type { Locale } from '../i18n/locale';

/**
 * Texto de una etiqueta en un idioma. Si falta ese idioma cae al idioma por defecto del sitio y,
 * si tampoco está, al primero declarado: una etiqueta a medio traducir nunca queda vacía.
 */
export const resolveLabel = (label: Label, locale: Locale, defaultLocale: Locale): string =>
  typeof label === 'string'
    ? label
    : (label[locale] ?? label[defaultLocale] ?? Object.values(label)[0] ?? '');
