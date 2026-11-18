import { readImageSizes } from '../loader/images';
import type { VirtualConfig } from '../virtual/data';

/** Tamaños de la imagen social del sitio y de las que se pidan (`undefined` se ignora). */
export function siteImageSizes(
  config: Pick<VirtualConfig, 'seo' | 'publicDir'>,
  extra: readonly (string | undefined)[] = [],
) {
  return readImageSizes(
    [config.seo.image?.src, ...extra].filter((src) => src !== undefined),
    new URL(config.publicDir),
  );
}
