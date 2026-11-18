import { initAutoSubmit } from './auto-submit';
import { initKindsAll } from './kinds-all';
import { initPopovers } from './popover';
import { initReport, type ReportOptions } from './report';

/** Lo que el panel necesita del navegador; inyectable para probarlo sin globales. */
interface PanelEnv {
  doc: Document;
  clipboard: ReportOptions['clipboard'];
}

/** El JS del panel SEO on page: solo lo cargan sus pantallas (dev), nunca el sitio publicado. */
export function bootPanel(env: PanelEnv = { doc: document, clipboard: navigator.clipboard }): void {
  initAutoSubmit(env.doc);
  initKindsAll(env.doc);
  initPopovers(env.doc);
  initReport(env.doc, { clipboard: env.clipboard });
}
