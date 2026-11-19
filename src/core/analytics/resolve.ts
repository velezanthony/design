import { DocsError, DocsErrors } from '../errors';
import type { Locale } from '../i18n/locale';
import type { ResolvedConfig } from '../config/resolve';
import type { Label } from '../config/schema';

/** Variable de entorno de la que sale el ID del contenedor de GTM. */
export const GTM_ENV_VAR = 'PUBLIC_GTM_ID';

/** Un ID de contenedor de GTM: `GTM-` y letras mayúsculas o dígitos. */
const GTM_ID = /^GTM-[A-Z0-9]+$/;

/** Si `value` (sin espacios alrededor) tiene el formato de un ID de contenedor de GTM. */
export function isGtmId(value: string) {
  return GTM_ID.test(value.trim());
}

/** El error de un ID mal formado, con su origen (config o variable de entorno); el valor no se imprime: sigue siendo un dato del consumidor. */
export function invalidGtmIdError(fromConfig: boolean) {
  const origin = fromConfig
    ? 'La opción `gtmId` de la config'
    : `La variable ${GTM_ENV_VAR} (leída de .env, .env.production o del entorno de la CI)`;
  return new DocsError(`${origin} no tiene el formato de un ID de contenedor de GTM.`, {
    hint: `Debe ser GTM-XXXXXXX (letras mayúsculas y dígitos). Corrígela o déjala vacía para no cargar analítica.`,
  });
}

/** Gana `configGtmId` sobre el entorno; vacío es no definido, y un ID mal formado falla aquí. */
export function resolveAnalytics(
  envValue: string | undefined,
  configGtmId: string | undefined,
): string | undefined {
  const fromConfig = configGtmId?.trim();
  const fromEnv = envValue?.trim();
  const id = fromConfig || fromEnv;
  if (!id) return undefined;
  if (!GTM_ID.test(id)) throw invalidGtmIdError(Boolean(fromConfig));
  return id;
}

/** El error de una analítica sin política de privacidad: el aviso de consentimiento tiene que enlazarla. */
export function missingPrivacyUrlError() {
  return new DocsError(
    'La analítica (`gtmId` o la variable PUBLIC_GTM_ID) necesita `privacyUrl`: el aviso de consentimiento enlaza a la política.',
    {
      hint: 'Define `privacyUrl` con la URL de tu política (una por idioma si es un objeto), o quita el ID para no cargar analítica.',
    },
  );
}

/** Enlace de privacidad por idioma, sin inventar ninguno; una etiqueta sin el idioma ni el de por defecto falla. */
export function resolvePrivacyUrls(
  privacyUrl: Label | undefined,
  locales: readonly Locale[],
  defaultLocale: Locale,
): Record<Locale, string> | undefined {
  if (privacyUrl === undefined) return undefined;
  const urls: Record<Locale, string> = {};
  const missing: DocsError[] = [];
  for (const locale of locales) {
    const url =
      typeof privacyUrl === 'string'
        ? privacyUrl
        : (privacyUrl[locale] ?? privacyUrl[defaultLocale]);
    if (url === undefined) {
      missing.push(new DocsError(`privacyUrl: no hay política de privacidad para «${locale}».`));
    } else {
      urls[locale] = url;
    }
  }
  if (missing.length > 0) throw new DocsErrors(missing);
  return urls;
}

/** Fija `gtmId` y el enlace de privacidad por idioma; el ID exige `privacyUrl` y `enabled: false` lo quita sin tocar el enlace del pie. */
export function applyAnalytics(
  config: ResolvedConfig,
  envValue: string | undefined,
  enabled = true,
): ResolvedConfig {
  const { privacyUrl, gtmId: configGtmId, ...rest } = config;
  const gtmId = enabled ? resolveAnalytics(envValue, configGtmId) : undefined;
  const urls = resolvePrivacyUrls(privacyUrl, config.locales, config.defaultLocale);
  if (gtmId !== undefined && urls === undefined) throw missingPrivacyUrlError();
  return {
    ...rest,
    ...(gtmId !== undefined && { gtmId }),
    ...(urls !== undefined && { privacyUrl: urls }),
  };
}
