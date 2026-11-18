import type { Label } from '../config/schema';
import type { Locale } from '../i18n/locale';

/** Texto de una etiqueta: cae al idioma por defecto y luego al primero declarado, así nunca queda vacía. */
export function resolveLabel(label: Label, locale: Locale, defaultLocale: Locale): string {
  return typeof label === 'string'
    ? label
    : (label[locale] ?? label[defaultLocale] ?? Object.values(label)[0] ?? '');
}
