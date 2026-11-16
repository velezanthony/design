import { initHeadingAnchors } from '../../client/anchors';
import { initConsent } from '../../client/consent';
import { initCopyCode } from '../../client/copy-code';
import { swapNotFound } from '../../client/not-found';
import { initSearch } from '../../client/search';
import { storageOf } from '../../client/storage';
import { initTabs } from '../../client/tabs';
import { initTheme } from '../../client/theme';
import { trackSections } from '../../client/toc';
import { localeFromPath } from '../../core/i18n/locale';
import { themeColors } from '../styles/theme-colors';

/** El navegador que necesitan los `init*`; inyectable para probarlos sin globales. */
export interface BootEnv {
  doc: Document;
  storage: Storage | undefined;
  system: Parameters<typeof initTheme>[0]['system'];
  clipboard: Pick<Clipboard, 'writeText'> | undefined;
  hostname: string;
  reload: () => void;
  pathname: string;
}

/** El entorno real. Se lee al ejecutar el script, nunca al importar el módulo. */
const browserEnv = (): BootEnv => ({
  doc: document,
  storage: storageOf('localStorage'),
  system: matchMedia('(prefers-color-scheme: dark)'),
  clipboard: navigator.clipboard,
  hostname: location.hostname,
  reload: () => location.reload(),
  pathname: location.pathname,
});

/**
 * Cablea todo el cliente de una página de docs: tema, consentimiento, buscadores, pestañas, botón
 * de copiar, anclas de encabezado e índice de contenidos. Cada `init*` ignora lo que la página no
 * tenga. Los textos vienen de `data-*` de `<main>` (el catálogo de la página ya resuelto).
 */
export function bootDocs(env: BootEnv = browserEnv()): void {
  const { doc } = env;
  initTheme({ doc, storage: env.storage, system: env.system, colors: themeColors });
  initConsent({ doc, storage: env.storage, hostname: env.hostname, reload: env.reload });
  for (const search of doc.querySelectorAll<HTMLElement>('[data-search]')) initSearch(search);
  initTabs(doc);

  const main = doc.querySelector<HTMLElement>('main');
  if (main) {
    const { copyLabel, copiedLabel, copyFailedLabel, anchorLabel } = main.dataset;
    if (copyLabel && copiedLabel && copyFailedLabel) {
      initCopyCode(doc, {
        clipboard: env.clipboard,
        labels: { copy: copyLabel, copied: copiedLabel, failed: copyFailedLabel },
      });
    }
    if (anchorLabel) initHeadingAnchors(doc, anchorLabel);
  }

  const toc = doc.querySelector('nav.toc');
  if (toc) trackSections(toc, { doc });
}

/**
 * La 404 de GitHub Pages es una sola (`<base>/404.html`, idioma por defecto): según la URL pedida
 * sustituye el cuerpo por el de ese idioma y SOLO DESPUÉS cablea el cliente, así que los `init*`
 * ven ya el DOM definitivo. Los datos de la sustitución viajan en `data-nf-*` de `<html>`.
 */
export function bootNotFound(env: BootEnv = browserEnv()): void {
  const { doc } = env;
  const { nfBase, nfLocales, nfDefault } = doc.documentElement.dataset;
  if (nfBase !== undefined && nfLocales !== undefined && nfDefault !== undefined) {
    swapNotFound(doc, localeFromPath(env.pathname, nfBase, nfLocales.split(','), nfDefault));
  }
  bootDocs(env);
}
