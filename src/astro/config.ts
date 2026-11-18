import type { UrlPolicy } from '../core/i18n/availability';
import type { Locale } from '../core/i18n/locale';

/** Cómo se forman las URLs: `base` y barra final de Astro, idioma por defecto de la librería. */
export function urlPolicyOf(
  astro: Pick<UrlPolicy, 'base' | 'trailingSlash'>,
  defaultLocale: Locale,
): UrlPolicy {
  return { base: astro.base, trailingSlash: astro.trailingSlash, defaultLocale };
}
