import type { ResolvedConfig } from '../../config/resolve';
import type { UrlPolicy } from '../../i18n/availability';
import { pageUrl } from '../../i18n/availability';
import { resolveMeta, withImageSize, type ImageSizes, type SeoBase } from '../../seo/meta';
import { composeTitle } from '../../seo/title';
import type { SeoPageInput } from '../tree/input';
import type { DescriptionSource, MetaNode, OgImageSource } from '../tree/types';

/** Si sin la descripción del sitio sigue habiendo una, es de la página; si no, es heredada. */
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

/** La imagen es una unidad en la cascada (`resolveMeta`): o la declara la página o viene del sitio. */
function ogImageSource(page: SeoPageInput, image: MetaNode['ogImage']): OgImageSource {
  if (!image) return 'none';
  return page.seo?.image ? 'page' : 'site';
}

/** Mismas funciones que `buildHead`, para que el panel enseñe lo que sale en el `<head>`. */
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
    ogTitle: title,
    ...(description !== undefined && { ogDescription: description }),
    ...(image && { ogImage: image }),
    ogImageSource: ogImageSource(page, image),
    canonical: pageUrl(page.slug, page.locale, url),
    noindex: resolved.noindex,
  };
}
