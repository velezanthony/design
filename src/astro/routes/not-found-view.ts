import { pageUrl } from '../../core/i18n/availability';
import type { Locale } from '../../core/i18n/locale';
import type { UiStrings } from '../../core/i18n/ui-strings';
import { buildHead, type HeadConfig } from '../../core/seo/head';
import {
  applyTitleTemplate,
  resolveMeta,
  withImageSize,
  type ImageSizes,
} from '../../core/seo/meta';
import { urlPolicyOf } from './pages';
import type { VirtualConfig } from '../virtual/data';

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
}

export interface NotFoundView {
  lang: Locale;
  head: HeadConfig[];
  siteName: string;
  homeHref: string;
  strings: UiStrings;
  baseUrl: string;
  privacyUrl?: string;
  gtmId?: string;
  others: NotFoundOther[];
  swap?: { base: string; locales: Locale[]; defaultLocale: Locale };
}

/**
 * Datos de una 404. `/404` (sin `locale`) es el idioma por defecto y trae las plantillas de los
 * demás más los datos de la sustitución en sitio; `/<locale>/404/` pinta su idioma directamente.
 */
export function notFoundView(
  locale: Locale | undefined,
  cfg: VirtualConfig,
  sizes: ImageSizes = new Map(),
): NotFoundView {
  const lang = locale ?? cfg.defaultLocale;
  const url = urlPolicyOf(cfg);
  const strings = cfg.strings[lang] as UiStrings;
  const meta = withImageSize(
    resolveMeta(
      cfg.seo,
      { description: strings['notFound.description'] },
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
            return {
              lang: other,
              // El <title> de la plantilla lleva la misma plantilla que el de su propia `/<locale>/404/`.
              title: applyTitleTemplate(
                cfg.seo.titleTemplate,
                otherStrings['notFound.title'],
                cfg.name,
              ),
              homeHref: pageUrl('', other, url),
              strings: otherStrings,
            };
          })
      : [];
  return {
    lang,
    head,
    siteName: cfg.name,
    homeHref: pageUrl('', lang, url),
    strings,
    baseUrl: `${cfg.base.replace(/\/+$/, '')}/`,
    ...(cfg.privacyUrl !== undefined && { privacyUrl: cfg.privacyUrl }),
    ...(cfg.gtmId !== undefined && { gtmId: cfg.gtmId }),
    others,
    ...(others.length > 0 && {
      swap: {
        base: `${cfg.base.replace(/\/+$/, '')}/`,
        locales: cfg.locales,
        defaultLocale: cfg.defaultLocale,
      },
    }),
  };
}
