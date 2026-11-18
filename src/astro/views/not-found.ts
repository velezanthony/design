import { pageUrl } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildFooter, type FooterView } from '../../core/navigation/footer';
import { buildHead, type HeadConfig } from '../../core/seo/head';
import { resolveMeta, withImageSize, type ImageSizes } from '../../core/seo/meta';
import { composeTitle, resolveTitleSuffix } from '../../core/seo/title';
import type { DocData } from '../loader/schema';
import { consentOf, navContextOf, siteContext } from './chrome';
import type { VirtualConfig } from '../virtual/data';
import { baseUrl } from '../../core/shared/urls';

/** Rutas `[locale]/404`: una por idioma que no es el de defecto (`/404` sirve el de defecto). */
export const notFoundRoutes = (cfg: Pick<VirtualConfig, 'locales' | 'defaultLocale'>) =>
  cfg.locales
    .filter((locale) => locale !== cfg.defaultLocale)
    .map((locale) => ({ params: { locale } }));

/** Cuerpo de la 404 de otro idioma, para su `<template data-locale>`. */
export interface NotFoundOther {
  lang: Locale;
  title: string;
  homeHref: string;
  strings: UiStrings;
  footer: FooterView;
  /** Política de privacidad de este idioma (solo con analítica o `privacyUrl`). */
  privacyUrl?: string;
}

export interface NotFoundView {
  lang: Locale;
  head: HeadConfig[];
  siteName: string;
  homeHref: string;
  strings: UiStrings;
  footer: FooterView;
  baseUrl: string;
  privacyUrl?: string;
  gtmId?: string;
  others: NotFoundOther[];
  swap?: { base: string; locales: Locale[]; defaultLocale: Locale };
}

interface NotFoundViewInput {
  locale: Locale | undefined;
  cfg: VirtualConfig;
  data?: DocData[];
  sizes?: ImageSizes;
}

/**
 * Datos de una 404. `/404` (sin `locale`) es el idioma por defecto y trae las plantillas de los
 * demás más los datos de la sustitución en sitio; `/<locale>/404/` pinta su idioma directamente.
 */
export function notFoundView({
  locale,
  cfg,
  data = [],
  sizes = new Map(),
}: NotFoundViewInput): NotFoundView {
  const lang = locale ?? cfg.defaultLocale;
  const site = siteContext(cfg, data);
  const { url } = site;
  const strings = cfg.strings[lang] as UiStrings;
  // La 404 no es una página: el contexto solo sirve para resolver a dónde apuntan los enlaces del footer.
  const footerFor = (locale: Locale) =>
    buildFooter(cfg, navContextOf(site, locale, ''), cfg.strings[locale] as UiStrings);
  const meta = withImageSize(
    resolveMeta(
      cfg.seo,
      /* Sin los schemas del sitio: describen el proyecto y sus páginas, no una página que no existe. */
      { description: strings['notFound.description'], schema: false },
      { title: strings['notFound.title'] },
      lang,
    ),
    sizes,
  );
  const head = buildHead(
    { ...meta, noindex: true },
    { kind: 'notFound', slug: '', locale: lang, url: pageUrl('', lang, url) },
    new Map(),
    new URL(cfg.site),
    cfg,
    url,
  );
  const others: NotFoundOther[] =
    locale === undefined
      ? cfg.locales
          .filter((other) => other !== cfg.defaultLocale)
          .map((other) => {
            const otherStrings = cfg.strings[other] as UiStrings;
            const { privacyUrl } = consentOf(cfg, other);
            return {
              lang: other,
              // El <title> de la plantilla se compone igual que el de su propia `/<locale>/404/`.
              title: composeTitle(
                otherStrings['notFound.title'],
                resolveTitleSuffix(undefined, cfg.seo.titleSuffix, other),
              ),
              homeHref: pageUrl('', other, url),
              strings: otherStrings,
              footer: footerFor(other),
              ...(privacyUrl !== undefined && { privacyUrl }),
            };
          })
      : [];
  return {
    lang,
    head,
    siteName: cfg.name,
    homeHref: pageUrl('', lang, url),
    strings,
    footer: footerFor(lang),
    baseUrl: baseUrl(cfg.base),
    ...consentOf(cfg, lang),
    others,
    ...(others.length > 0 && {
      swap: {
        base: baseUrl(cfg.base),
        locales: cfg.locales,
        defaultLocale: cfg.defaultLocale,
      },
    }),
  };
}
