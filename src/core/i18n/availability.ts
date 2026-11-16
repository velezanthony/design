import type { Page } from '../content/discovery';
import type { Locale } from './locale';

/** Cómo se forman las URLs del sitio: base de Astro, barra final e idioma sin prefijo. */
export interface UrlPolicy {
  base: string;
  trailingSlash: 'always' | 'never' | 'ignore';
  defaultLocale: Locale;
}

/** Por slug, el idioma → URL de cada página REAL (nunca de rutas de reserva). */
export type Availability = Map<string, Partial<Record<Locale, string>>>;

/**
 * URL de una página: `<base>/[<locale>/]<slug>/`. El idioma por defecto va sin prefijo; `ignore`
 * se trata como `always`; con `never` desaparece la barra final salvo en la raíz del sitio.
 */
export function pageUrl(slug: string, locale: Locale, url: UrlPolicy): string {
  const segments = [
    ...url.base.split('/'),
    ...(locale === url.defaultLocale ? [] : [locale]),
    ...slug.split('/'),
  ].filter(Boolean);
  const path = `/${segments.join('/')}`;
  if (url.trailingSlash === 'never' || segments.length === 0) return path;
  return `${path}/`;
}

/** Mapa de disponibilidad: única fuente de verdad de LocaleSwitch, hreflang y sitemap. */
export function buildAvailability(pages: Page[], url: UrlPolicy): Availability {
  const availability: Availability = new Map();
  for (const page of pages) {
    availability.set(page.slug, {
      ...availability.get(page.slug),
      [page.locale]: pageUrl(page.slug, page.locale, url),
    });
  }
  return availability;
}
