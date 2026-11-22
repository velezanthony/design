import type { Locale } from '../../core/i18n/locale';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { resolveLabel } from '../../core/navigation/label';
import { siteConfig } from './site-config';

/** Los textos de interfaz ya fusionados con los del sitio; un idioma que no es suyo es un error de quien llama. */
export function designStrings(locale: Locale): UiStrings {
  const strings = siteConfig.strings[locale];
  if (!strings) throw new Error(`El sitio no tiene textos para el idioma «${locale}».`);
  return strings;
}

/** Ya resuelto por la librería desde `PUBLIC_GTM_ID` o la config, con el formato validado. */
export const gtmId: string | undefined = siteConfig.site.analytics.gtmId;

/** La URL de privacidad ya resuelta para ese idioma (cae al idioma por defecto); `undefined` si el sitio no declara `privacyUrl`. */
export function privacyUrl(locale: Locale): string | undefined {
  const label = siteConfig.site.analytics.privacyUrl;
  const { defaultLocale } = siteConfig.i18n;
  return label === undefined ? undefined : resolveLabel(label, locale, defaultLocale);
}
