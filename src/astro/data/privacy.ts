import { privacyView } from '../views/privacy';
import { getDocData } from './docs-collection';
import { siteImageSizes } from './image-sizes';
import { siteConfig } from './site-config';

/** Lo que pinta la privacidad; lo comparten `privacy.astro` y `privacy-locale.astro`. */
export async function loadPrivacyView(locale?: string) {
  return privacyView(locale, siteConfig, await siteImageSizes(siteConfig), await getDocData());
}
