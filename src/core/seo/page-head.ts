import type { ConfigPick } from '../config/resolve';
import type { JsonLd, PageSeoOverride } from '../config/schema';
import type { Locale } from '../i18n/locale';
import { buildHead, type HeadConfig, type OgType } from './head';
import { withContext } from './json-ld';
import { resolveMeta, withImageSize, type ImageSizes } from './meta';

/** Lo que una página del sitio (no de docs) cuenta de sí misma para su `<head>`. */
export interface PageHeadInput {
  /** Título de la página; el bloque `seo` puede cambiarlo solo para el `<head>`. */
  title: string;
  /** El bloque `seo` del frontmatter, o los valores sueltos de una página que no es Markdown. */
  seo?: PageSeoOverride;
  /** Idioma de la página. */
  locale: Locale;
  /** Ruta de la página con la base delante: la de su `canonical`. */
  url: string;
  /** La misma página en cada idioma (ruta con base): de ahí salen los `hreflang`. Sin ella, ninguno. */
  alternates?: Partial<Record<Locale, string>>;
  /** `og:type`; `article` si no se dice. */
  ogType?: OgType;
  /** JSON-LD propio de la página, tras el del sitio; vive aparte del `seo.schema` del frontmatter. */
  schema?: readonly JsonLd[];
}

/** Lo que el `<head>` toma de la config del sitio. */
export type PageHeadConfig = ConfigPick<'seo' | 'name' | 'favicon', 'locales' | 'defaultLocale'> & {
  base: string;
};

/** `<head>` de una página de sitio con la config de la librería: sufijo del título, imagen y JSON-LD del sitio, idiomas y tema, sin que el consumidor interprete nada. */
export function buildPageHead(
  input: PageHeadInput,
  config: PageHeadConfig,
  site: URL,
  sizes: ImageSizes = new Map(),
): HeadConfig[] {
  const resolved = withImageSize(
    resolveMeta(config.site.seo, input.seo, { title: input.title }, input.locale),
    sizes,
  );
  const schemas = [...resolved.schemas, ...(input.schema ?? []).map(withContext)];
  // Una página `noindex` va como las de reserva: sin canonical ni hreflang, que no la nombran.
  const kind = resolved.noindex ? 'fallback' : 'page';
  const slug = input.url;
  return buildHead(
    { ...resolved, schemas },
    {
      kind,
      slug,
      locale: input.locale,
      url: input.url,
      ...(input.ogType && { ogType: input.ogType }),
    },
    new Map([[slug, { [input.locale]: input.url, ...input.alternates }]]),
    site,
    config,
    config,
  );
}
