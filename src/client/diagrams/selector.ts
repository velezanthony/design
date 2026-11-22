/** Un bloque de Mermaid en el contenido; aparte para que `boot.ts` lo busque sin cargar los diagramas. */
export const DIAGRAM_SELECTOR = '.docs-mermaid[data-mermaid]';

/** Cómo termina un bloque: dibujado, o con su código a la vista. Sin `data-state` está cargando. */
export type DiagramState = 'rendered' | 'error';

/** Anuncia los bloques como ocupados (`aria-busy`) mientras se descarga y dibuja Mermaid. */
export function markDiagramsBusy(htmlDocument: Document): void {
  for (const block of htmlDocument.querySelectorAll(DIAGRAM_SELECTOR)) {
    block.setAttribute('aria-busy', 'true');
  }
}

/** Fija el estado final de un bloque; deja de estar ocupado y el CSS quita el indicador de carga. */
export function settleDiagram(block: Element, state: DiagramState): void {
  block.setAttribute('data-state', state);
  block.removeAttribute('aria-busy');
}

/** Pasa a `error` los bloques que siguen cargando, para que nunca se queden en el indicador. */
export function failPendingDiagrams(htmlDocument: Document): void {
  for (const block of htmlDocument.querySelectorAll(`${DIAGRAM_SELECTOR}:not([data-state])`)) {
    settleDiagram(block, 'error');
  }
}
