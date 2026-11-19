import { initHeadingAnchors } from '../../client/content/anchors';
import { initConsent } from '../../client/preferences/consent';
import { initCopyCode } from '../../client/content/copy-code';
import { initLayout, type RailQuery } from '../../client/layout/layout';
import { RAIL_QUERY } from '../../client/layout/rail';
import type { MermaidImporter } from '../../client/diagrams/mermaid';
import { DIAGRAM_SELECTOR } from '../../client/diagrams/selector';
import { readToken } from '../../client/diagrams/token';
import { initSearch, initSearchShortcut } from '../../client/search';
import { initSidebarScroll } from '../../client/layout/sidebar-scroll';
import { storageOf } from '../../client/preferences/storage';
import { initTabs } from '../../client/content/tabs';
import { initTheme } from '../../client/preferences/theme';
import type { MotionPreference } from '../../client/transition';
import { initCurrentYear } from '../../client/layout/year';
import { initZoom } from '../../client/content/zoom';
import { trackSections } from '../../client/layout/toc';
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
  };
}

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

/** Cablea el contenido de un `Article` (docs o no): pestañas, copiar, anclas, zoom, diagramas e índice; los textos vienen de `data-*` del contenedor. */
export function bootArticle(env: BootEnv = browserEnv()): void {
  const { htmlDocument } = env;
  initTabs(htmlDocument, env.motion);

  /* Con los textos en `data-copy-label` se localiza el contenedor: es un `<main>` en docs y puede ser un `<div>` fuera de ellas. */
  const main = htmlDocument.querySelector<HTMLElement>('[data-copy-label]');
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
