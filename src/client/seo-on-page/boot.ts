import { initAutoSubmit } from './auto-submit';
import { initKindsAll } from './kinds-all';
import { initPopovers } from './popover';
import { initReport, type ReportOptions } from './report';

/** Lo que el panel necesita del navegador; inyectable para probarlo sin globales. */
interface PanelEnv {
  htmlDocument: Document;
  clipboard: ReportOptions['clipboard'];
}

/** El JS del panel SEO on page: solo lo cargan sus pantallas (dev), nunca el sitio publicado. */
export function bootPanel(
  env: PanelEnv = { htmlDocument: document, clipboard: navigator.clipboard },
): void {
  initAutoSubmit(env.htmlDocument);
  initKindsAll(env.htmlDocument);
  initPopovers(env.htmlDocument);
  initReport(env.htmlDocument, { clipboard: env.clipboard });
}
