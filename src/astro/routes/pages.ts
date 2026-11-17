import type { Page } from '../../core/content/discovery';
import { buildAvailability, type UrlPolicy } from '../../core/i18n/availability';
import { noindexUrls } from '../../core/seo/indexable';
import { buildSitemap } from '../../core/seo/sitemap';
import type { Locale } from '../../core/i18n/locale';
import { privacyAvailability } from '../../core/privacy/pages';
import { toAstroError } from '../integration/errors';
import type { VirtualConfig } from '../virtual/data';

/** Lo que el loader guarda de cada página (`docsSchema`); es lo que ven los contenedores. */
export interface DocData {
  slug: string;
  locale: string;
  title: string;
  sourcePath: string;
  order?: number;
  seo?: Page['seo'];
  translations?: Page['translations'];
  /** Ruta del archivo relativa a la raíz del repo; solo con `editUrl`. */
  editPath?: string;
}

/** Cómo se forman las URLs: lo que hace falta de la config del módulo virtual. */
export const urlPolicyOf = (
  cfg: Pick<VirtualConfig, 'base' | 'trailingSlash' | 'defaultLocale'>,
): UrlPolicy => ({
  base: cfg.base,
  trailingSlash: cfg.trailingSlash,
  defaultLocale: cfg.defaultLocale,
});

/**
 * `Page` del núcleo a partir de los datos de la colección. El cuerpo no interviene en la
 * navegación, el head ni el sitemap, así que no se arrastra.
 */
export const pagesOf = (data: DocData[]): Page[] =>
  data.map((item) => ({
    slug: item.slug,
    locale: item.locale,
    title: item.title,
    kind: 'native',
    sourcePath: item.sourcePath,
    body: '',
    ...(item.order !== undefined && { order: item.order }),
    ...(item.seo && { seo: item.seo }),
    ...(item.translations && { translations: item.translations }),
  }));

/**
 * El único `sitemap.xml` del sitio: solo páginas REALES e indexables (ni rutas de reserva ni 404)
 * más la de privacidad si es propia, con los alternates por idioma. Un fallo del núcleo sale como `AstroError`.
 */
export function sitemapXml(
  data: DocData[],
  cfg: Pick<VirtualConfig, 'base' | 'trailingSlash' | 'defaultLocale' | 'site'> & {
    locales?: Locale[];
    privacy?: { page: boolean };
  },
): string {
  const pages = pagesOf(data);
  const url = urlPolicyOf(cfg);
  const av = buildAvailability(pages, url);
  // La página de privacidad propia no es contenido: se suma aquí, con su hreflang entre idiomas.
  if (cfg.privacy?.page && cfg.locales) {
    for (const [key, urls] of privacyAvailability(cfg.locales, url)) av.set(key, urls);
  }
  try {
    return buildSitemap(av, new URL(cfg.site), noindexUrls(pages, url));
  } catch (error) {
    throw toAstroError(error, 'No se puede generar sitemap.xml.');
  }
}
