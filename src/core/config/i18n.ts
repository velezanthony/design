import { z } from 'astro/zod';
import type { Locale } from '../i18n/locale';
import { MissingTranslation } from '../i18n/translation-policy';
import { defaultStrings, uiKeys, type UiKey, type UiOverrides } from '../i18n/ui-strings';
import { MissingTranslationSchema } from './shared-schemas';

/* `i18n`: los idiomas del sitio, qué hacer sin traducción y los textos de interfaz. */

/* Esquema estricto de `ui`, generado desde las claves del catálogo: una clave desconocida falla. */
export const UiLocaleSchema = z.strictObject(
  Object.fromEntries(uiKeys.map((key) => [key, z.string().optional()])) as Record<
    UiKey,
    z.ZodOptional<z.ZodString>
  >,
);

/** Idiomas del sitio si no se declaran. */
export const DEFAULT_LOCALES = ['en'];

/** `i18n`: todo opcional. */
export const I18nSchema = z
  .strictObject({
    /** Idiomas del sitio; el primero es el de por defecto si no se declara `defaultLocale`. */
    locales: z.array(z.string().min(1)).min(1).optional(),
    /** Idioma sin prefijo en la URL; debe estar en `locales`. */
    defaultLocale: z.string().optional(),
    /** Qué hacer con una página sin traducción (`MissingTranslation`). */
    missing: MissingTranslationSchema.optional(),
    /** Textos de interfaz propios por idioma; sustituyen a los del paquete. */
    ui: z.record(z.string(), UiLocaleSchema).optional(),
  })
  .superRefine((i18n, context) => {
    const locales = i18n.locales ?? DEFAULT_LOCALES;
    function issue(path: (string | number)[], message: string) {
      context.addIssue({ code: 'custom', path, message });
    }
    locales.forEach((locale, index) => {
      if (!(locale in defaultStrings)) {
        issue(
          ['locales', index],
          `El idioma «${locale}» no tiene textos de interfaz en el paquete (disponibles: ${Object.keys(defaultStrings).join(', ')}).`,
        );
      }
    });
    if (i18n.defaultLocale !== undefined && !locales.includes(i18n.defaultLocale)) {
      issue(['defaultLocale'], notInLocales(i18n.defaultLocale, locales));
    }
    for (const locale of Object.keys(i18n.ui ?? {})) {
      if (!locales.includes(locale)) issue(['ui', locale], notInLocales(locale, locales));
    }
  });

/** El mensaje de un idioma que no está en `i18n.locales`. */
export function notInLocales(locale: string, locales: readonly string[]): string {
  return `«${locale}» no está en \`i18n.locales\` (${locales.join(', ')}).`;
}

/** `i18n` resuelto. `missingDeclared`: el sitio eligió la política; entonces una traducción ausente no es un olvido. */
export interface ResolvedI18n {
  locales: Locale[];
  defaultLocale: Locale;
  missing: MissingTranslation;
  missingDeclared: boolean;
  ui: UiOverrides;
}

/** Completa `i18n` con los valores por defecto (el idioma por defecto es el primero). */
export function resolveI18n(i18n: z.output<typeof I18nSchema> = {}): ResolvedI18n {
  const locales = i18n.locales ?? DEFAULT_LOCALES;
  return {
    locales,
    defaultLocale: i18n.defaultLocale ?? locales[0]!, // el esquema exige al menos un idioma
    missing: i18n.missing ?? MissingTranslation.LINK,
    missingDeclared: i18n.missing !== undefined,
    ui: i18n.ui ?? {},
  };
}
