import { readImageSizes } from '../loader/images';
import { privacyView } from '../views/privacy';
import { getDocs } from './docs-collection';
import { siteConfig } from './site-config';

/* Lee lo que necesita la página de privacidad (colección de docs, tamaño de la imagen social,
   config virtual) y se lo pasa a `privacyView`. Vive en `data/` porque toca `astro:content`:
   `ui/` no puede, y por eso la antigua `PrivacyPage.astro` no era un componente sino un lector. Lo
   comparten `privacy.astro` y `privacy-locale.astro` (cada patrón tiene sus `getStaticPaths`). */
export async function loadPrivacyView(locale?: string) {
  const sizes = await readImageSizes(
    [siteConfig.seo.image?.src].filter((src) => src !== undefined),
    new URL(siteConfig.publicDir ?? 'file:///'),
  );
  const data = (await getDocs()).map((entry) => entry.data);
  return privacyView(locale, siteConfig, sizes, data);
}
