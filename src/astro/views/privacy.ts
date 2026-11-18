import { pageUrl } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildFooter, type FooterView } from '../../core/navigation/footer';
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
import { consentOf, navContextOf, siteContext } from './chrome';
import type { VirtualConfig } from '../virtual/data';
import { baseUrl } from '../../core/shared/urls';

/** Parámetros de `getStaticPaths` de la página de privacidad (ver `core/privacy/pages`). */
export function privacyRoutes(config: Pick<VirtualConfig, 'locales' | 'defaultLocale'>) {
  return routesOf(config.locales, config.defaultLocale);
}

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
  config: VirtualConfig;
  data?: DocData[];
  sizes?: ImageSizes;
}

/** Datos de la página de privacidad en un idioma (`undefined` es el idioma por defecto). */
export function privacyView({
  locale,
  config,
  data = [],
  sizes = new Map(),
}: PrivacyViewInput): PrivacyView {
  const lang = locale ?? config.defaultLocale;
  const site = siteContext(config, data);
  const { url } = site;
  const strings = config.strings[lang] as UiStrings;
  const availability = privacyAvailability(config.locales, url);
  const title = strings['consent.privacy'];
  const meta = withImageSize(
    resolveMeta(config.seo, { description: strings['privacy.description'] }, { title }, lang),
    sizes,
  );
  // Es una página normal e indexable: canonical y hreflang salen de su entrada de disponibilidad.
  const head = buildHead(
    meta,
    {
      kind: 'page',
      slug: [...availability.keys()][0] ?? '',
      locale: lang,
      url: pageUrl(privacySlug(lang), lang, url),
    },
    availability,
    new URL(config.site),
    config,
    url,
  );
  const navContext = navContextOf(site, lang, '');
  return {
    lang,
    head,
    siteName: config.name,
    homeHref: pageUrl('', lang, url),
    hrefs: [...availability.values()][0] ?? {},
    strings,
    nav: buildNav(config.nav, navContext),
    footer: buildFooter(config, navContext, strings),
    baseUrl: baseUrl(config.base),
    ...consentOf(config, lang),
    title,
    sections: privacyCopy(lang, config.privacy.controller),
    updated: { iso: PRIVACY_UPDATED, text: formatPrivacyDate(lang, PRIVACY_UPDATED) },
  };
}
