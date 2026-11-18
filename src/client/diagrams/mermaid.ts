import { DIAGRAM_SELECTOR } from './selector';
import {
  createDiagramViewer,
  ICONS,
  type DiagramViewer,
  type DiagramViewerLabels,
} from './diagram-viewer';
import { isDark, parseTheme } from '../preferences/theme';

/** Lo que usamos de Mermaid; el módulo real lo cumple y los tests lo sustituyen por un doble. */
export interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
}

/** `() => import('mermaid')`, inyectable: así se prueba que sin diagramas NO se descarga. */
export type MermaidImporter = () => Promise<{ default: MermaidApi }>;

export interface MermaidOptions {
  importer: MermaidImporter;
  /** El valor calculado de una propiedad CSS del `<html>` (`--color-ink`…). */
  readToken: (name: string) => string;
  /** La preferencia del sistema, para el tema cuando nadie ha elegido uno. */
  system: Pick<MediaQueryList, 'matches'> & {
    addEventListener(type: 'change', callback: () => void): void;
  };
  /** Nombre accesible de un diagrama que no declara `accTitle`; ya localizado. */
  label?: string;
  /**
   * Textos del botón «pantalla completa» y del visor, ya localizados. Sin ellos los diagramas se
   * dibujan igual pero no se pueden ampliar: un botón sin nombre accesible no tiene sentido.
   */
  viewerLabels?: DiagramViewerLabels & { expand: string };
  warn?: (message: string, error?: unknown) => void;
}

/**
 * Las variables del tema `base` de Mermaid, leídas de los tokens de la paleta para que los
 * diagramas la sigan (también en oscuro: los tokens ya cambian con `data-theme`). Las aristas van
 * en `ink` y no en `rule`, que con 1.42:1 no se distinguiría como línea; `rule` queda para los
 * bordes de agrupaciones y notas. Mermaid deriva el resto de colores con khroma, que solo entiende
 * hex/rgb/hsl: los tokens del tema deben declararse así.
 */
export function mermaidThemeVariables(
  readToken: (name: string) => string,
  dark: boolean,
): Record<string, string | boolean> {
  function token(name: string) {
    return readToken(name).trim();
  }
  const ink = token('--color-ink');
  const canvas = token('--color-canvas');
  const raised = token('--color-raised');
  const rule = token('--color-rule');
  return {
    darkMode: dark,
    background: canvas,
    fontFamily: token('--font-sans'),
    primaryColor: token('--color-accent-soft'),
    primaryTextColor: ink,
    primaryBorderColor: token('--color-accent-line'),
    secondaryColor: raised,
    tertiaryColor: canvas,
    mainBkg: token('--color-accent-soft'),
    nodeBorder: token('--color-accent-line'),
    lineColor: ink,
    textColor: ink,
    titleColor: ink,
    edgeLabelBackground: canvas,
    clusterBkg: raised,
    clusterBorder: rule,
    noteBkgColor: raised,
    noteTextColor: ink,
    noteBorderColor: rule,
  };
}

/** Cuánto puede encogerse un diagrama para caber en la columna: al 75 % el texto de 16px queda en 12px. */
const LEGIBLE_SCALE = 0.75;

/**
 * Ancho mínimo (px) de un diagrama a partir de su `viewBox`. Mermaid lo dibuja a escala de la
 * columna, y uno de 2000px quedaría al 40 %, con letra de 6px: con este mínimo deja de encogerse y
 * se desplaza dentro de su recuadro. `undefined` si el `viewBox` no da un ancho válido.
 */
export function legibleMinWidth(viewBox: string | null): number | undefined {
  const width = Number(viewBox?.trim().split(/[\s,]+/)[2]);
  if (!Number.isFinite(width) || width <= 0) return undefined;
  return Math.ceil(width * LEGIBLE_SCALE);
}

/** La configuración de `mermaid.initialize` para el tema actual. */
export function mermaidConfig(
  readToken: (name: string) => string,
  dark: boolean,
): Record<string, unknown> {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: mermaidThemeVariables(readToken, dark),
    /* Un error de sintaxis no pinta el «bomb» de Mermaid: el bloque conserva su código y avisamos. */
    suppressErrorRendering: true,
  };
}

/**
 * El marco `.docs-code` del bloque, el mismo que `copy-code.ts` pone a un bloque de código: el
 * botón de copiar, el de ampliar y el SVG viven en él. Si el de copiar no lo creó (sin API de
 * portapapeles), se crea aquí.
 */
function codeFrame(htmlDocument: Document, block: HTMLElement): HTMLElement {
  const pre = block.querySelector('pre')!;
  const parent = pre.parentElement!;
  if (parent.classList.contains('docs-code')) return parent;
  const frame = htmlDocument.createElement('div');
  frame.className = 'docs-code';
  pre.replaceWith(frame);
  frame.append(pre);
  return frame;
}

/** El botón de «pantalla completa» del marco; abre una copia del SVG que la figura tenga EN ESE MOMENTO. */
function addExpandButton(
  htmlDocument: Document,
  frame: HTMLElement,
  figure: HTMLElement,
  viewer: DiagramViewer,
  label: string,
): void {
  const button = htmlDocument.createElement('button');
  button.type = 'button';
  button.className = 'docs-expand';
  button.setAttribute('aria-label', label);
  button.innerHTML = ICONS.expand;
  button.addEventListener('click', () => {
    const svg = figure.querySelector('svg');
    if (svg) viewer.open(svg, figure.getAttribute('aria-label') ?? '', button);
  });
  frame.append(button);
}

/** El `accTitle: …` que el autor puso en el diagrama, si lo hay. */
export function accessibleTitle(source: string): string | undefined {
  return /^\s*accTitle\s*:\s*(.+?)\s*$/m.exec(source)?.[1];
}

/**
 * Dibuja los `.docs-mermaid[data-mermaid]` de la página como SVG. Mermaid pesa cientos de KB: solo
 * se importa si la página tiene algún diagrama. El código fuente se queda en el `pre` (que con
 * `data-state="rendered"` solo enseña su etiqueta de lenguaje, el mismo cromo que un bloque de
 * código) y de ahí se lee para volver a dibujar cuando cambia el tema, por `data-theme` o por el
 * sistema, y lo copia el botón de `copy-code.ts`. Cada diagrama dibujado gana un botón para verlo a
 * pantalla completa (`diagram-viewer.ts`). Si un diagrama falla queda `data-state="error"`, con su
 * código visible y un aviso en consola; nunca se rompe la página. Devuelve cuando termina el
 * primer dibujado (las tareas siguientes, las del cambio de tema, se encadenan por detrás).
 */
export async function initMermaid(
  htmlDocument: Document,
  { importer, readToken, system, label, viewerLabels, warn = console.warn }: MermaidOptions,
): Promise<void> {
  const blocks = [...htmlDocument.querySelectorAll<HTMLElement>(DIAGRAM_SELECTOR)];
  if (!blocks.length) return;

  let mermaid: MermaidApi;
  try {
    mermaid = (await importer()).default;
  } catch (error) {
    warn('No se pudo cargar Mermaid: los diagramas se muestran como código.', error);
    return;
  }

  const root = htmlDocument.documentElement;
  let counter = 0;
  const viewer: DiagramViewer | undefined = viewerLabels
    ? createDiagramViewer(htmlDocument, viewerLabels)
    : undefined;

  async function renderAll() {
    const dark = isDark(parseTheme(root.dataset.theme), system.matches);
    mermaid.initialize(mermaidConfig(readToken, dark));
    for (const block of blocks) {
      const source = block.querySelector('pre')?.textContent ?? '';
      try {
        const { svg } = await mermaid.render(`docs-mermaid-${counter++}`, source);
        let figure = block.querySelector<HTMLElement>('.docs-mermaid-figure');
        if (!figure) {
          const frame = codeFrame(htmlDocument, block);
          figure = htmlDocument.createElement('div');
          figure.className = 'docs-mermaid-figure';
          figure.setAttribute('role', 'img');
          frame.querySelector('pre')!.after(figure);
          if (viewer && viewerLabels)
            addExpandButton(htmlDocument, frame, figure, viewer, viewerLabels.expand);
        }
        const name = accessibleTitle(source) ?? label;
        if (name) figure.setAttribute('aria-label', name);
        figure.innerHTML = svg;
        const drawn = figure.querySelector('svg');
        const minWidth = legibleMinWidth(drawn?.getAttribute('viewBox') ?? null);
        if (drawn && minWidth) drawn.style.minWidth = `${minWidth}px`;
        block.setAttribute('data-state', 'rendered');
      } catch (error) {
        /* Si ya había un dibujo (cambio de tema) se conserva el anterior en vez de dejar un hueco. */
        if (!block.querySelector('.docs-mermaid-figure')) block.setAttribute('data-state', 'error');
        warn('No se pudo dibujar un diagrama de Mermaid; se deja su código.', error);
      }
    }
  }

  let chain = renderAll();
  function redraw() {
    /* El visor trabaja con un clon del dibujo viejo: con otro tema tendría los colores equivocados. */
    viewer?.close();
    chain = chain.then(renderAll);
  }
  const Observer = htmlDocument.defaultView?.MutationObserver;
  if (Observer) {
    new Observer(redraw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  system.addEventListener('change', redraw);
  await chain;
}
