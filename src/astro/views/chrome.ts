import { buildAvailability, type Availability, type UrlPolicy } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import { resolvePolicies, type TranslationPolicies } from '../../core/i18n/translation-policy';
import { resolveLabel } from '../../core/navigation/label';
import type { NavContext } from '../../core/navigation/nav-entries';
import type { Page } from '../../core/content/discovery';
import type { DocData } from '../loader/schema';
import type { VirtualConfig } from '../virtual/data';
import { urlPolicyOf } from '../config';
import { pagesOf } from './pages';

/** Lo que cabecera y pie necesitan del sitio, calculado una sola vez por vista. */
export interface SiteContext {
  cfg: VirtualConfig;
  pages: Page[];
  url: UrlPolicy;
  av: Availability;
  policies: TranslationPolicies;
}

export function siteContext(cfg: VirtualConfig, data: DocData[]): SiteContext {
  const pages = pagesOf(data);
  const url = urlPolicyOf(cfg, cfg.defaultLocale);
  return {
    cfg,
    pages,
    url,
    av: buildAvailability(pages, url),
    policies: resolvePolicies(pages, cfg.translations.missing).policies,
  };
}

/** El contexto del núcleo para construir cabecera, pie y barra lateral de una página. */
export function navContextOf(site: SiteContext, locale: Locale, slug: string): NavContext {
  const { cfg, pages, av, policies, url } = site;
  return { pages, av, locale, cfg, policies, url, slug };
}

/** Enlace a la política de privacidad y ID de analítica; cada clave solo está si existe. */
export function consentOf(
  cfg: Pick<VirtualConfig, 'privacyUrl' | 'gtmId' | 'defaultLocale'>,
  locale: Locale,
): { privacyUrl?: string; gtmId?: string } {
  return {
    ...(cfg.privacyUrl !== undefined && {
      privacyUrl: resolveLabel(cfg.privacyUrl, locale, cfg.defaultLocale),
    }),
    ...(cfg.gtmId !== undefined && { gtmId: cfg.gtmId }),
  };
}
