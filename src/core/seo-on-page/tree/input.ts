import type { ResolvedConfig } from '../../config/resolve';
import type { Page } from '../../content/discovery';
import type { UrlPolicy } from '../../i18n/availability';
import type { ImageSizes } from '../../seo/meta';
import type { HeadingNode } from './types';

/** Una página con lo que el análisis necesita: los datos de `Page` (sin el cuerpo) y sus encabezados. */
export interface SeoPageInput extends Omit<Page, 'body' | 'order'> {
  headings: HeadingNode[];
}

export interface SeoInput {
  /** La config resuelta; sin `ui`, que no interviene en el SEO. */
  config: Omit<ResolvedConfig, 'ui'>;
  url: UrlPolicy;
  pages: SeoPageInput[];
  /** Dimensiones de las imágenes locales, si el adaptador las leyó (completan `og:image:*`). */
  imageSizes?: ImageSizes;
}
