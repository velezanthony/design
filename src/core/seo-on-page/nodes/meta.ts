import type { ResolvedConfig } from '../../config/resolve';
import type { UrlPolicy } from '../../i18n/availability';
import { pageUrl } from '../../i18n/availability';
import { resolveMeta, withImageSize, type ImageSizes, type SeoBase } from '../../seo/meta';
import { composeTitle } from '../../seo/title';
import type { SeoPageInput } from '../tree/input';
import type { DescriptionSource, MetaNode } from '../tree/types';

/**
 * De dónde sale la descripción. Se reaprovecha la cascada de `resolveMeta` en vez de reescribirla:
 * si QUITANDO la del sitio sigue habiendo descripción, es de la página; si solo aparece con ella,
 * es heredada. Así «misma frase que el sitio» no se confunde con «heredada».
 */
function descriptionSource(
  base: SeoBase,
  page: SeoPageInput,
  withDescription: string | undefined,
): DescriptionSource {
  if (withDescription === undefined) return 'none';
  const withoutSite: SeoBase = {
    titleSuffix: base.titleSuffix,
    ...(base.image && { image: base.image }),
  };
  const own = resolveMeta(withoutSite, page.seo, page, page.locale).description;
  return own === undefined ? 'site' : 'page';
}

/**
 * Metadatos que se publican, calculados con las MISMAS funciones que `buildHead` (cascada, sufijo,
 * canonical), de modo que el panel enseña por construcción lo que sale en el `<head>`.
 */
export function buildMetaNode(
  page: SeoPageInput,
  config: Pick<ResolvedConfig, 'seo'>,
  url: UrlPolicy,
  imageSizes: ImageSizes = new Map(),
): MetaNode {
  const resolved = withImageSize(resolveMeta(config.seo, page.seo, page, page.locale), imageSizes);
  const title = composeTitle(resolved.title, resolved.titleSuffix);
  const { description, image } = resolved;
  return {
    title,
    titleLength: title.length,
    ...(description !== undefined && { description, descriptionLength: description.length }),
    descriptionSource: descriptionSource(config.seo, page, description),
    ogTitle: resolved.title,
    ...(description !== undefined && { ogDescription: description }),
    ...(image && { ogImage: image }),
    canonical: pageUrl(page.slug, page.locale, url),
    noindex: resolved.noindex,
  };
}
