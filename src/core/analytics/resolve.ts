import { DocsError, DocsErrors } from '../errors';
import type { Locale } from '../i18n/locale';
import type { ResolvedConfig } from '../config/resolve';
import type { Label } from '../config/schema';

/** Variable de entorno de la que sale el ID del contenedor de GTM. */
export const GTM_ENV_VAR = 'PUBLIC_GTM_ID';

/** Un ID de contenedor de GTM: `GTM-` y letras mayúsculas o dígitos. */
const GTM_ID = /^GTM-[A-Z0-9]+$/;

/**
 * Política de privacidad por defecto, por idioma: la del portfolio, que es de donde cuelgan los
 * repos con documentación. Solo se usa si hay analítica y el consumidor no dio `privacyUrl`.
 */
export const DEFAULT_PRIVACY_URLS: Readonly<Record<Locale, string>> = {
  es: 'https://velezanthony.github.io/privacidad/',
  en: 'https://velezanthony.github.io/en/privacy/',
};

/**
 * Decide si hay analítica y con qué contenedor. Gana `configGtmId` (anulación explícita) y, si no,
 * el valor del entorno. Vacío o en blanco equivale a no definido: sin ID, sin analítica. Un ID con
 * un formato imposible falla aquí, en la construcción, y no como un aviso que nunca carga nada.
 */
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

/**
 * Enlace de privacidad de cada idioma. Una cadena vale para todos; una etiqueta cae al idioma por
 * defecto como cualquier otra. Sin `privacyUrl` y con analítica se usa el del portfolio; sin
 * analítica no hay enlace. Si con analítica algún idioma se queda sin URL, falla nombrándolo.
 */
export function resolvePrivacyUrls(
  privacyUrl: Label | undefined,
  analyticsOn: boolean,
  locales: readonly Locale[],
  defaultLocale: Locale,
): Record<Locale, string> | undefined {
  if (privacyUrl === undefined && !analyticsOn) return undefined;
  const urls: Record<Locale, string> = {};
  const missing: DocsError[] = [];
  for (const locale of locales) {
    const url =
      privacyUrl === undefined
        ? DEFAULT_PRIVACY_URLS[locale]
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

/**
 * Fija la analítica efectiva de la config: el `gtmId` (config o entorno) y, ya por idioma, el
 * enlace de privacidad. Sin ID quita `gtmId`; la `privacyUrl` explícita se conserva para el footer.
 */
export function applyAnalytics(
  config: ResolvedConfig,
  envValue: string | undefined,
): ResolvedConfig {
  const { privacyUrl, gtmId: configGtmId, ...rest } = config;
  const gtmId = resolveAnalytics(envValue, configGtmId);
  const urls = resolvePrivacyUrls(
    privacyUrl,
    gtmId !== undefined,
    config.locales,
    config.defaultLocale,
  );
  return {
    ...rest,
    ...(gtmId !== undefined && { gtmId }),
    ...(urls !== undefined && { privacyUrl: urls }),
  };
}
