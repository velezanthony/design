import { initHeadingAnchors } from '../../client/content/anchors';
import { initCopyCode } from '../../client/content/copy-code';
import { DIAGRAM_SELECTOR } from '../../client/diagrams/selector';
import { initTabs } from '../../client/content/tabs';
import { initZoom } from '../../client/content/zoom';
import { trackSections } from '../../client/layout/toc';
import { browserEnv, type BootEnv } from './env';

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
