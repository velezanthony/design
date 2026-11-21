import { initHeadingAnchors } from '../../client/content/anchors';
import { initCopyCode } from '../../client/content/copy-code';
import {
  DIAGRAM_SELECTOR,
  failPendingDiagrams,
  markDiagramsBusy,
} from '../../client/diagrams/selector';
import { initIndexPager } from '../../client/content/index-pager';
import { initTabs } from '../../client/content/tabs';
import { initZoom } from '../../client/content/zoom';
import { trackSections } from '../../client/layout/toc';
import { browserEnv, type BootEnv } from './env';

/** Cablea el contenido de un `Article` (docs o no): pestañas, copiar, anclas, zoom, diagramas e índice; los textos vienen de `data-*` del contenedor. */
export function bootArticle(env: BootEnv = browserEnv()): void {
  const { htmlDocument } = env;
  let drawing = false;
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
      drawing = true;
      markDiagramsBusy(htmlDocument);
      /* Mermaid empieza a bajar ya, a la par que el código que lo dibuja, en vez de esperar a
         que este llegue. El `catch` vacío solo evita un aviso de promesa sin capturar mientras
         tanto: el fallo lo recibe `initMermaid`, que espera esta misma promesa. */
      const library = mermaid.importer();
      library.catch(() => {});
      /* Si el trozo no llega (red, despliegue nuevo con otro hash) o falla al arrancar, ningún
         bloque se queda en el indicador de carga: pasan a `error` y se lee su código. */
      import('../../client/diagrams/mermaid')
        .then(({ initMermaid }) =>
          initMermaid(htmlDocument, {
            ...mermaid,
            importer: () => library,
            system: env.system,
            label: diagramLabel,
            viewerLabels,
          }),
        )
        .catch((error: unknown) => {
          console.warn('No se pudieron cargar los diagramas: se muestran como código.', error);
          failPendingDiagrams(htmlDocument);
        });
    }
  }

  /* Sin `<main>` con los textos o sin cargador no habrá dibujo: el código, sin esperar al CSS. */
  if (!drawing) failPendingDiagrams(htmlDocument);

  /* El selector «Por página» de un índice generado: sin JavaScript se queda oculto. */
  if (env.location) {
    initIndexPager(htmlDocument, {
      storage: env.storage,
      location: env.location,
      history: env.history,
      browserWindow: env.browserWindow,
    });
  }

  const toc = htmlDocument.querySelector('nav.toc');
  if (toc) trackSections(toc, { htmlDocument });
}
