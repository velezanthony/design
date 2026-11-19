import { initConsent } from '../../client/preferences/consent';
import { initLayout } from '../../client/layout/layout';
import { initSearch, initSearchShortcut } from '../../client/search';
import { initSidebarScroll } from '../../client/layout/sidebar-scroll';
import { initTheme } from '../../client/preferences/theme';
import { initCurrentYear } from '../../client/layout/year';
import { browserEnv, type BootEnv } from '../boot/env';
import { themeColors } from '../styles/theme-colors';

/** Lo que cablea todo documento de `BaseLayout`: el tema y el consentimiento. */
export function bootBase(env: BootEnv = browserEnv()): void {
  const { htmlDocument } = env;
  initTheme({
    htmlDocument,
    storage: env.storage,
    system: env.system,
    colors: themeColors,
    motion: env.motion,
  });
  initConsent({ htmlDocument, storage: env.storage, hostname: env.hostname, reload: env.reload });
}

/** Cablea el cliente propio de una página de docs: columnas, barra, búsqueda y año. El tema y el consentimiento los cablea `bootBase`; el contenido, `bootArticle`. */
export function bootDocs(env: BootEnv = browserEnv()): void {
  const { htmlDocument } = env;
  initLayout({ htmlDocument, storage: env.storage, rail: env.rail });
  if (env.browserWindow) {
    initSidebarScroll({
      htmlDocument,
      storage: env.session,
      browserWindow: env.browserWindow,
      rail: env.rail,
    });
  }
  for (const search of htmlDocument.querySelectorAll<HTMLElement>('[data-search]'))
    initSearch(search);
  initSearchShortcut(htmlDocument);
  initCurrentYear(htmlDocument);
}
