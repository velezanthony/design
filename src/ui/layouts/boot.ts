import { initHeadingAnchors } from '../../client/layout/anchors';
import { initConsent } from '../../client/preferences/consent';
import { initCopyCode } from '../../client/content/copy-code';
import { initLayout, type RailQuery } from '../../client/layout/layout';
import type { MermaidImporter } from '../../client/diagrams/mermaid';
import { DIAGRAM_SELECTOR } from '../../client/diagrams/selector';
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
  doc: Document;
  storage: Storage | undefined;
  /** `sessionStorage`, para el desplazamiento de la barra lateral. */
  session?: Storage;
  /** La ventana, para saber cuándo se sale de la página (`pagehide`). Sin ella no se recuerda. */
  win?: Pick<Window, 'addEventListener'>;
  system: Parameters<typeof initTheme>[0]['system'];
  /** `(prefers-reduced-motion: reduce)`; sin él, las transiciones se permiten. */
  motion?: MotionPreference;
  /** `(min-width: 64rem)`: desde ahí existe el raíl de los laterales (por debajo, el «Menú»). */
  rail?: RailQuery;
  /** Cómo cargar Mermaid y leer los tokens del tema. Sin él, los diagramas se quedan como código. */
  mermaid?: { importer: MermaidImporter; readToken: (name: string) => string };
  clipboard: Pick<Clipboard, 'writeText'> | undefined;
  hostname: string;
  reload: () => void;
  pathname: string;
}

/** El entorno real. Se lee al ejecutar el script, nunca al importar el módulo. */
const browserEnv = (): BootEnv => ({
  doc: document,
  storage: storageOf('localStorage'),
  session: storageOf('sessionStorage'),
  win: window,
  system: matchMedia('(prefers-color-scheme: dark)'),
  motion: matchMedia('(prefers-reduced-motion: reduce)'),
  rail: matchMedia('(min-width: 64rem)'),
  /* `import('mermaid')` es un trozo aparte que el navegador solo descarga si una página lo pide. */
  mermaid: {
    importer: () => import('mermaid'),
    readToken: (name) => getComputedStyle(document.documentElement).getPropertyValue(name),
  },
  clipboard: navigator.clipboard,
  hostname: location.hostname,
  reload: () => location.reload(),
  pathname: location.pathname,
});

/**
 * Cablea todo el cliente de una página de docs: tema, columnas plegables y ancho, consentimiento, buscadores, pestañas, botón
 * de copiar, ampliación de imágenes, diagramas de Mermaid, anclas de encabezado e índice de contenidos. Cada `init*` ignora lo que la página no
 * tenga. Los textos vienen de `data-*` de `<main>` (el catálogo de la página ya resuelto).
 */
export function bootDocs(env: BootEnv = browserEnv()): void {
  const { doc } = env;
  initTheme({
    doc,
    storage: env.storage,
    system: env.system,
    colors: themeColors,
    motion: env.motion,
  });
  initLayout({ doc, storage: env.storage, rail: env.rail });
  if (env.win) {
    initSidebarScroll({ doc, storage: env.session, win: env.win, rail: env.rail });
  }
  initConsent({ doc, storage: env.storage, hostname: env.hostname, reload: env.reload });
  for (const search of doc.querySelectorAll<HTMLElement>('[data-search]')) initSearch(search);
  initSearchShortcut(doc);
  initCurrentYear(doc);
  initTabs(doc, env.motion);

  const main = doc.querySelector<HTMLElement>('main');
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
      initCopyCode(doc, {
        clipboard: env.clipboard,
        labels: { copy: copyLabel, copied: copiedLabel, failed: copyFailedLabel },
      });
    }
    if (anchorLabel) initHeadingAnchors(doc, anchorLabel);
    if (zoomLabel && zoomCloseLabel) {
      initZoom(doc, { labels: { open: zoomLabel, close: zoomCloseLabel }, motion: env.motion });
    }
    // El código de diagramas solo se descarga en las páginas que tienen alguno.
    const { mermaid } = env;
    if (mermaid && doc.querySelector(DIAGRAM_SELECTOR)) {
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
        initMermaid(doc, { ...mermaid, system: env.system, label: diagramLabel, viewerLabels }),
      );
    }
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
