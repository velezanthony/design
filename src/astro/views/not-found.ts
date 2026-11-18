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
export function notFoundRoutes(config: Pick<VirtualConfig, 'locales' | 'defaultLocale'>) {
  return config.locales
    .filter((locale) => locale !== config.defaultLocale)
    .map((locale) => ({ params: { locale } }));
}

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
  config: VirtualConfig;
  data?: DocData[];
  sizes?: ImageSizes;
}

/** Datos de una 404: `/404` es el idioma por defecto con las plantillas de los demás; `/<locale>/404/` pinta el suyo. */
export function notFoundView({
  locale,
  config,
  data = [],
  sizes = new Map(),
}: NotFoundViewInput): NotFoundView {
  const lang = locale ?? config.defaultLocale;
  const site = siteContext(config, data);
  const { url } = site;
  const strings = config.strings[lang] as UiStrings;
  // La 404 no es una página: el contexto solo sirve para resolver a dónde apuntan los enlaces del footer.
  function footerFor(locale: Locale) {
    return buildFooter(config, navContextOf(site, locale, ''), config.strings[locale] as UiStrings);
  }
  const meta = withImageSize(
    resolveMeta(
      config.seo,
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
    new URL(config.site),
    config,
    url,
  );
  const others: NotFoundOther[] =
    locale === undefined
      ? config.locales
          .filter((other) => other !== config.defaultLocale)
          .map((other) => {
            const otherStrings = config.strings[other] as UiStrings;
            const { privacyUrl } = consentOf(config, other);
            return {
              lang: other,
              // El <title> de la plantilla se compone igual que el de su propia `/<locale>/404/`.
              title: composeTitle(
                otherStrings['notFound.title'],
                resolveTitleSuffix(undefined, config.seo.titleSuffix, other),
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
    siteName: config.name,
    homeHref: pageUrl('', lang, url),
    strings,
    footer: footerFor(lang),
    baseUrl: baseUrl(config.base),
    ...consentOf(config, lang),
    others,
    ...(others.length > 0 && {
      swap: {
        base: baseUrl(config.base),
        locales: config.locales,
        defaultLocale: config.defaultLocale,
      },
    }),
  };
}
