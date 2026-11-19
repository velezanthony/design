import type { HeadConfig } from '../../core/seo/head';
import { buildPageHead, type PageHeadInput } from '../../core/seo/page-head';
import { siteImageSizes } from './image-sizes';
import { siteConfig } from './site-config';

export type { PageHeadInput };

/** `<head>` de una página del sitio con la config de la librería; devuelve lo que `BaseLayout` espera en `head`. Asíncrona: lee el tamaño de las imágenes sociales. */
export async function pageHead(input: PageHeadInput): Promise<HeadConfig[]> {
  const sizes = await siteImageSizes(siteConfig, [input.seo?.image?.src]);
  return buildPageHead(input, siteConfig, new URL(siteConfig.site), sizes);
}
