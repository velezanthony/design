import type { Page } from '../content/discovery';
import { urlSlugOf } from '../content/slug';
import type { Locale } from './locale';

/** Cómo se forman las URLs del sitio: base de Astro, barra final e idioma sin prefijo. */
export interface UrlPolicy {
  base: string;
  trailingSlash: 'always' | 'never' | 'ignore';
  defaultLocale: Locale;
}

/** Por identidad (`Page.slug`, la del archivo), el idioma → URL de cada página REAL (nunca de rutas de reserva); la URL ya lleva el `slug` propio de cada idioma. */
export type Availability = Map<string, Partial<Record<Locale, string>>>;

/** Segmento de idioma de una URL: vacío en el idioma por defecto, el código en los demás. */
export function localePrefix(locale: Locale, defaultLocale: Locale): string {
  return locale === defaultLocale ? '' : locale;
}

/** URL de una página `<base>/[<locale>/]<slug>/`; el idioma por defecto va sin prefijo y `never` quita la barra final. */
export function pageUrl(slug: string, locale: Locale, url: UrlPolicy): string {
  const segments = [
    ...url.base.split('/'),
    localePrefix(locale, url.defaultLocale),
    ...slug.split('/'),
  ].filter(Boolean);
  const path = `/${segments.join('/')}`;
  if (url.trailingSlash === 'never' || segments.length === 0) return path;
  return `${path}/`;
}

/** URL de una página real: su `slug` propio (o su identidad) en su idioma. */
export function pageUrlOf(page: Pick<Page, 'slug' | 'urlSlug' | 'locale'>, url: UrlPolicy): string {
  return pageUrl(urlSlugOf(page), page.locale, url);
}

/** Mapa de disponibilidad: única fuente de verdad de LocaleSwitch, hreflang y sitemap. */
export function buildAvailability(pages: Page[], url: UrlPolicy): Availability {
  const availability: Availability = new Map();
  for (const page of pages) {
    availability.set(page.slug, {
      ...availability.get(page.slug),
      [page.locale]: pageUrlOf(page, url),
    });
  }
  return availability;
}
