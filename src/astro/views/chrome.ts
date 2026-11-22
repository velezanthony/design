import { buildAvailability, type Availability, type UrlPolicy } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import { resolvePolicies, type TranslationPolicies } from '../../core/i18n/translation-policy';
import { resolveLabel } from '../../core/navigation/label';
import type { NavContext } from '../../core/navigation/nav-entries';
import type { Page } from '../../core/content/discovery';
import type { DocData } from '../loader/schema';
import type { VirtualConfig } from '../virtual/data';
import { urlPolicyOf } from '../config';
import { pagesOf } from '../../core/content/stored-page';
import type { ConfigPick } from '../../core/config/resolve';

/** Lo que cabecera y pie necesitan del sitio, calculado una sola vez por vista. */
export interface SiteContext {
  config: VirtualConfig;
  pages: Page[];
  url: UrlPolicy;
  availability: Availability;
  policies: TranslationPolicies;
}

export function siteContext(config: VirtualConfig, data: DocData[]): SiteContext {
  const pages = pagesOf(data);
  const url = urlPolicyOf(config, config.i18n.defaultLocale);
  return {
    config,
    pages,
    url,
    availability: buildAvailability(pages, url),
    policies: resolvePolicies(pages, config.i18n.missing).policies,
  };
}

/** El contexto del núcleo para construir cabecera, pie y barra lateral de una página: `slug` es su identidad y `urlSlug` la URL de la ruta, si es otra. */
export function navContextOf(
  site: SiteContext,
  { locale, slug, urlSlug }: { locale: Locale; slug: string; urlSlug?: string },
): NavContext {
  const { config, pages, availability, policies, url } = site;
  return {
    pages,
    availability,
    locale,
    config,
    policies,
    url,
    slug,
    ...(urlSlug !== undefined && urlSlug !== slug && { urlSlug }),
  };
}

/** Enlace a la política de privacidad y ID de analítica; cada clave solo está si existe. */
export function consentOf(
  config: ConfigPick<'analytics', 'defaultLocale'>,
  locale: Locale,
): { privacyUrl?: string; gtmId?: string } {
  return {
    ...(config.site.analytics.privacyUrl !== undefined && {
      privacyUrl: resolveLabel(config.site.analytics.privacyUrl, locale, config.i18n.defaultLocale),
    }),
    ...(config.site.analytics.gtmId !== undefined && { gtmId: config.site.analytics.gtmId }),
  };
}
