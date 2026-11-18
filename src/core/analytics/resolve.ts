import { DocsError, DocsErrors } from '../errors';
import type { UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { privacyPageUrls } from '../privacy/pages';
import type { ResolvedConfig } from '../config/resolve';
import type { Label } from '../config/schema';

/** Variable de entorno de la que sale el ID del contenedor de GTM. */
export const GTM_ENV_VAR = 'PUBLIC_GTM_ID';

/** Un ID de contenedor de GTM: `GTM-` y letras mayúsculas o dígitos. */
const GTM_ID = /^GTM-[A-Z0-9]+$/;

/** Política de privacidad por defecto por idioma: la del portfolio; solo con analítica y sin `privacyUrl`. */
export const DEFAULT_PRIVACY_URLS: Readonly<Record<Locale, string>> = {
  es: 'https://velezanthony.github.io/privacidad/',
  en: 'https://velezanthony.github.io/en/privacy/',
};

/** Gana `configGtmId` sobre el entorno; vacío es no definido, y un ID mal formado falla aquí. */
export function resolveAnalytics(
  envValue: string | undefined,
  configGtmId: string | undefined,
): string | undefined {
  const fromConfig = configGtmId?.trim();
  const fromEnv = envValue?.trim();
  const id = fromConfig || fromEnv;
  if (!id) return undefined;
  if (!GTM_ID.test(id)) {
    // El valor no se imprime: un ID mal escrito sigue siendo un dato del consumidor.
    const origin = fromConfig
      ? 'La opción `gtmId` de la config'
      : `La variable ${GTM_ENV_VAR} (leída de .env, .env.production o del entorno de la CI)`;
    throw new DocsError(`${origin} no tiene el formato de un ID de contenedor de GTM.`, {
      hint: `Debe ser GTM-XXXXXXX (letras mayúsculas y dígitos). Corrígela o déjala vacía para no cargar analítica.`,
    });
  }
  return id;
}

/** Enlace de privacidad por idioma: sin `privacyUrl` y con analítica, el del portfolio; sin URL en algún idioma falla. */
export function resolvePrivacyUrls(
  privacyUrl: Label | undefined,
  analyticsOn: boolean,
  locales: readonly Locale[],
  defaultLocale: Locale,
  localUrls?: Record<Locale, string>,
): Record<Locale, string> | undefined {
  if (privacyUrl === undefined && !analyticsOn && localUrls === undefined) return undefined;
  const urls: Record<Locale, string> = {};
  const missing: DocsError[] = [];
  for (const locale of locales) {
    const url =
      privacyUrl === undefined
        ? (localUrls?.[locale] ?? DEFAULT_PRIVACY_URLS[locale])
        : typeof privacyUrl === 'string'
          ? privacyUrl
          : (privacyUrl[locale] ?? privacyUrl[defaultLocale]);
    if (url === undefined) {
      missing.push(
        new DocsError(`privacyUrl: no hay política de privacidad para «${locale}».`, {
          hint: 'La analítica está activa: define `privacyUrl` con una URL por idioma.',
        }),
      );
    } else {
      urls[locale] = url;
    }
  }
  if (missing.length > 0) throw new DocsErrors(missing);
  return urls;
}

/** Fija `gtmId` y el enlace de privacidad por idioma; sin ID quita `gtmId` y conserva la `privacyUrl` para el footer. */
export function applyAnalytics(
  config: ResolvedConfig,
  envValue: string | undefined,
  url: UrlPolicy = { base: '/', trailingSlash: 'always', defaultLocale: config.defaultLocale },
): ResolvedConfig {
  const { privacyUrl, gtmId: configGtmId, ...rest } = config;
  const gtmId = resolveAnalytics(envValue, configGtmId);
  const urls = resolvePrivacyUrls(
    privacyUrl,
    gtmId !== undefined,
    config.locales,
    config.defaultLocale,
    // Con página propia el enlace apunta a ella, y no al portfolio, salvo `privacyUrl` explícita.
    config.privacy.page ? privacyPageUrls(config.locales, url) : undefined,
  );
  return {
    ...rest,
    ...(gtmId !== undefined && { gtmId }),
    ...(urls !== undefined && { privacyUrl: urls }),
  };
}
