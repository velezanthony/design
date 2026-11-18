import { initHeadingAnchors } from '../../client/layout/anchors';
import { initConsent } from '../../client/preferences/consent';
import { initCopyCode } from '../../client/content/copy-code';
import { initLayout, type RailQuery } from '../../client/layout/layout';
import { RAIL_QUERY } from '../../client/layout/rail';
import type { MermaidImporter } from '../../client/diagrams/mermaid';
import { DIAGRAM_SELECTOR } from '../../client/diagrams/selector';
import { readToken } from '../../client/diagrams/token';
import { swapNotFound } from '../../client/not-found';
import { initSearch, initSearchShortcut } from '../../client/search';
import { initSidebarScroll } from '../../client/layout/sidebar-scroll';
import { storageOf } from '../../client/preferences/storage';
import { initTabs } from '../../client/content/tabs';
import { initTheme } from '../../client/preferences/theme';
import type { MotionPreference } from '../../client/transition';
import { initCurrentYear } from '../../client/content/year';
import { initZoom } from '../../client/content/zoom';
import { trackSections } from '../../client/layout/toc';
import { localeFromPath } from '../../core/i18n/locale';
import { themeColors } from '../styles/theme-colors';

/** El navegador que necesitan los `init*`; inyectable para probarlos sin globales. */
export interface BootEnv {
  htmlDocument: Document;
  storage: Storage | undefined;
  /** `sessionStorage`, para el desplazamiento de la barra lateral. */
  session?: Storage;
  /** La ventana, para saber cuándo se sale de la página (`pagehide`). Sin ella no se recuerda. */
  browserWindow?: Pick<Window, 'addEventListener'>;
  system: Parameters<typeof initTheme>[0]['system'];
  /** `(prefers-reduced-motion: reduce)`; sin él, las transiciones se permiten. */
  motion?: MotionPreference;
  /** `RAIL_QUERY`: desde ahí existe el raíl de los laterales (por debajo, el «Menú»). */
  rail?: RailQuery;
  /** Cómo cargar Mermaid y leer los tokens del tema. Sin él, los diagramas se quedan como código. */
  mermaid?: { importer: MermaidImporter; readToken: (name: string) => string };
  clipboard: Pick<Clipboard, 'writeText'> | undefined;
  hostname: string;
  reload: () => void;
  pathname: string;
}

/** El entorno real. Se lee al ejecutar el script, nunca al importar el módulo. */
function browserEnv(): BootEnv {
  return {
    htmlDocument: document,
    storage: storageOf('localStorage'),
    session: storageOf('sessionStorage'),
    browserWindow: window,
    system: matchMedia('(prefers-color-scheme: dark)'),
    motion: matchMedia('(prefers-reduced-motion: reduce)'),
    rail: matchMedia(RAIL_QUERY),
    /* `import('mermaid')` es un trozo aparte que el navegador solo descarga si una página lo pide. */
    mermaid: {
      importer: () => import('mermaid'),
      readToken: (name) => readToken(document, name),
    },
    clipboard: navigator.clipboard,
    hostname: location.hostname,
    reload: () => location.reload(),
    pathname: location.pathname,
  };
}

/** Cablea todo el cliente de una página de docs; cada `init*` ignora lo que la página no tenga y los textos vienen de `data-*` de `<main>`. */
export function bootDocs(env: BootEnv = browserEnv()): void {
  const { htmlDocument } = env;
  initTheme({
    htmlDocument,
    storage: env.storage,
    system: env.system,
    colors: themeColors,
    motion: env.motion,
  });
  initLayout({ htmlDocument, storage: env.storage, rail: env.rail });
  if (env.browserWindow) {
    initSidebarScroll({
      htmlDocument,
      storage: env.session,
      browserWindow: env.browserWindow,
      rail: env.rail,
    });
  }
  initConsent({ htmlDocument, storage: env.storage, hostname: env.hostname, reload: env.reload });
  for (const search of htmlDocument.querySelectorAll<HTMLElement>('[data-search]'))
    initSearch(search);
  initSearchShortcut(htmlDocument);
  initCurrentYear(htmlDocument);
  initTabs(htmlDocument, env.motion);

  const main = htmlDocument.querySelector<HTMLElement>('main');
  if (main) {
    const {
      copyLabel,
      copiedLabel,
      copyFailedLabel,
      anchorLabel,
      zoomLabel,
      zoomCloseLabel,
      diagramLabel,
      diagramExpandLabel,
      diagramZoomInLabel,
      diagramZoomOutLabel,
      diagramFitLabel,
    } = main.dataset;
    if (copyLabel && copiedLabel && copyFailedLabel) {
      initCopyCode(htmlDocument, {
        clipboard: env.clipboard,
        labels: { copy: copyLabel, copied: copiedLabel, failed: copyFailedLabel },
      });
    }
    if (anchorLabel) initHeadingAnchors(htmlDocument, anchorLabel);
    if (zoomLabel && zoomCloseLabel) {
      initZoom(htmlDocument, {
        labels: { open: zoomLabel, close: zoomCloseLabel },
        motion: env.motion,
      });
    }
    // El código de diagramas solo se descarga en las páginas que tienen alguno.
    const { mermaid } = env;
    if (mermaid && htmlDocument.querySelector(DIAGRAM_SELECTOR)) {
      /* El visor a pantalla completa necesita todos sus textos (y el de cerrar, que es el de las
         imágenes): sin alguno no se ofrece, en vez de dejar un botón sin nombre. */
      const viewerLabels =
        diagramExpandLabel &&
        diagramZoomInLabel &&
        diagramZoomOutLabel &&
        diagramFitLabel &&
        zoomCloseLabel
          ? {
              expand: diagramExpandLabel,
              zoomIn: diagramZoomInLabel,
              zoomOut: diagramZoomOutLabel,
              fit: diagramFitLabel,
              close: zoomCloseLabel,
            }
          : undefined;
      void import('../../client/diagrams/mermaid').then(({ initMermaid }) =>
        initMermaid(htmlDocument, {
          ...mermaid,
          system: env.system,
          label: diagramLabel,
          viewerLabels,
        }),
      );
    }
  }

  const toc = htmlDocument.querySelector('nav.toc');
  if (toc) trackSections(toc, { htmlDocument });
}

/** La 404 de GitHub Pages es una sola: sustituye el cuerpo por el del idioma pedido y SOLO DESPUÉS cablea el cliente (datos en `data-nf-*` de `<html>`). */
export function bootNotFound(env: BootEnv = browserEnv()): void {
  const { htmlDocument } = env;
  const { nfBase, nfLocales, nfDefault } = htmlDocument.documentElement.dataset;
  if (nfBase !== undefined && nfLocales !== undefined && nfDefault !== undefined) {
    swapNotFound(
      htmlDocument,
      localeFromPath(env.pathname, nfBase, nfLocales.split(','), nfDefault),
    );
  }
  bootDocs(env);
}
