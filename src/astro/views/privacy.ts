import { buildAvailability, pageUrl } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import { resolvePolicies } from '../../core/i18n/translation-policy';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildFooter, type FooterView } from '../../core/navigation/footer';
import { resolveLabel } from '../../core/navigation/label';
import { buildNav, type NavEntry } from '../../core/navigation/nav-entries';
import { PRIVACY_UPDATED, privacyCopy, type PrivacySection } from '../../core/privacy/copy';
import {
  formatPrivacyDate,
  privacyAvailability,
  privacyRoutes as routesOf,
  privacySlug,
} from '../../core/privacy/pages';
import { buildHead, type HeadConfig } from '../../core/seo/head';
import { resolveMeta, withImageSize, type ImageSizes } from '../../core/seo/meta';
import type { DocData } from '../loader/schema';
import { pagesOf, urlPolicyOf } from './pages';
import type { VirtualConfig } from '../virtual/data';
import { baseUrl } from '../../core/shared/urls';

/** Parámetros de `getStaticPaths` de la página de privacidad (ver `core/privacy/pages`). */
export const privacyRoutes = (cfg: Pick<VirtualConfig, 'locales' | 'defaultLocale'>) =>
  routesOf(cfg.locales, cfg.defaultLocale);

/** Todo lo que `PrivacyLayout` necesita, ya calculado: el contenedor solo lo pasa. */
export interface PrivacyView {
  lang: Locale;
  head: HeadConfig[];
  siteName: string;
  homeHref: string;
  hrefs: Partial<Record<Locale, string>>;
  strings: UiStrings;
  nav: NavEntry[];
  footer: FooterView;
  baseUrl: string;
  /** Con `privacy.page` siempre hay enlace: esta misma página. */
  privacyUrl?: string;
  gtmId?: string;
  title: string;
  sections: PrivacySection[];
  updated: { iso: string; text: string };
}

interface PrivacyViewInput {
  locale: Locale | undefined;
  cfg: VirtualConfig;
  data?: DocData[];
  sizes?: ImageSizes;
}

/** Datos de la página de privacidad en un idioma (`undefined` es el idioma por defecto). */
export function privacyView({
  locale,
  cfg,
  data = [],
  sizes = new Map(),
}: PrivacyViewInput): PrivacyView {
  const lang = locale ?? cfg.defaultLocale;
  const url = urlPolicyOf(cfg);
  const strings = cfg.strings[lang] as UiStrings;
  const av = privacyAvailability(cfg.locales, url);
  const pages = pagesOf(data);
  const title = strings['consent.privacy'];
  const meta = withImageSize(
    resolveMeta(cfg.seo, { description: strings['privacy.description'] }, { title }, lang),
    sizes,
  );
  // Es una página normal e indexable: canonical y hreflang salen de su entrada de disponibilidad.
  const head = buildHead(
    meta,
    {
      kind: 'page',
      slug: [...av.keys()][0] ?? '',
      locale: lang,
      url: pageUrl(privacySlug(lang), lang, url),
    },
    av,
    new URL(cfg.site),
    cfg,
    url,
  );
  const navContext = {
    pages,
    av: buildAvailability(pages, url),
    locale: lang,
    cfg,
    policies: resolvePolicies(pages, cfg.translations.missing).policies,
    url,
    slug: '',
  };
  return {
    lang,
    head,
    siteName: cfg.name,
    homeHref: pageUrl('', lang, url),
    hrefs: [...av.values()][0] ?? {},
    strings,
    nav: buildNav(cfg.nav, navContext),
    footer: buildFooter(cfg, navContext, strings),
    baseUrl: baseUrl(cfg.base),
    ...(cfg.privacyUrl !== undefined && {
      privacyUrl: resolveLabel(cfg.privacyUrl, lang, cfg.defaultLocale),
    }),
    ...(cfg.gtmId !== undefined && { gtmId: cfg.gtmId }),
    title,
    sections: privacyCopy(lang, cfg.privacy.controller),
    updated: { iso: PRIVACY_UPDATED, text: formatPrivacyDate(lang, PRIVACY_UPDATED) },
  };
}
