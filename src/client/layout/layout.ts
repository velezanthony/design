import type { LayoutWidth, PanelState } from '../../core/config/layout';
import { LAYOUT_KEY, safeSet } from '../preferences/storage';

/** `left` es la barra de navegación; `right`, el índice «En esta página». */
export type Side = 'left' | 'right';

export interface LayoutState {
  left: PanelState;
  right: PanelState;
  width: LayoutWidth;
}

const PANEL_STATES: readonly PanelState[] = ['open', 'collapsed'];
const WIDTHS: readonly LayoutWidth[] = ['reading', 'full'];

const panelOf = (value: unknown): PanelState | undefined =>
  PANEL_STATES.find((state) => state === value);
const widthOf = (value: unknown): LayoutWidth | undefined =>
  WIDTHS.find((width) => width === value);

/**
 * Lo guardado, campo a campo: un valor ausente, desconocido o de otro tipo cae al de `fallback`
 * sin tumbar el resto. Cualquier texto que no sea un objeto JSON (basura, `null`, un array) es
 * «nada guardado».
 */
export function parseLayout(raw: string | null | undefined, fallback: LayoutState): LayoutState {
  let value: unknown;
  try {
    value = raw ? JSON.parse(raw) : undefined;
  } catch {
    value = undefined;
  }
  const saved = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
  const { left, right, width } = saved as Record<string, unknown>;
  return {
    left: panelOf(left) ?? fallback.left,
    right: panelOf(right) ?? fallback.right,
    width: widthOf(width) ?? fallback.width,
  };
}

export function serializeLayout(state: LayoutState): string {
  return JSON.stringify(state);
}

/** El estado con ese lado cambiado al contrario. No muta el original. */
export function togglePanel(state: LayoutState, side: Side): LayoutState {
  return { ...state, [side]: state[side] === 'open' ? 'collapsed' : 'open' };
}

export function withWidth(state: LayoutState, width: LayoutWidth): LayoutState {
  return { ...state, width };
}

/**
 * Código del script en línea que restaura el estado guardado antes del primer pintado: sin él la
 * página se pinta con el de la config y la rejilla salta (o se anima) al cargar el cliente. Va en
 * línea y no puede importar, por eso es una cadena. Solo pisa lo que el servidor puso en `<html>`
 * con valores válidos. Con `toggles: false` no hay script: no hay controles y lo guardado se ignora.
 */
export function layoutBootstrapScript({ toggles }: { toggles: boolean }): string {
  if (!toggles) return '';
  return `try {
  var saved = JSON.parse(localStorage.getItem(${JSON.stringify(LAYOUT_KEY)}) || 'null');
  if (saved && typeof saved === 'object') {
    var root = document.documentElement;
    var allowed = { left: ['open', 'collapsed'], right: ['open', 'collapsed'], width: ['reading', 'full'] };
    for (var key in allowed) {
      if (allowed[key].indexOf(saved[key]) !== -1) root.dataset[key] = saved[key];
    }
  }
} catch (e) {
  /* Almacenamiento bloqueado o JSON roto: manda la config. */
}`;
}

/** `matchMedia(RAIL_QUERY)`: si el raíl existe en este ancho. */
export interface RailQuery {
  matches: boolean;
  addEventListener?(type: 'change', listener: () => void): void;
}

export interface LayoutEnv {
  doc: Document;
  storage: Storage | undefined;
  /** Sin él se asume que el raíl existe (escritorio). */
  rail?: RailQuery;
}

/** El estado que `<html>` lleva ahora; lo que falte o esté roto es el valor por defecto. */
function readLayout(root: HTMLElement): LayoutState {
  return parseLayout(
    JSON.stringify({
      left: root.dataset.left,
      right: root.dataset.right,
      width: root.dataset.width,
    }),
    { left: 'open', right: 'open', width: 'reading' },
  );
}

/**
 * Cablea los botones de plegado (`[data-layout-toggle="left|right"]`) y los de ancho
 * (`[data-layout-width]`). La fuente de verdad es `<html data-left data-right data-width>`: el
 * servidor lo escribe, el script previo lo restaura y aquí se cambia, se refleja en `aria-*` e
 * `inert` y se guarda. Sin controles en la página (`toggles: false`) no hace nada.
 */
export function initLayout({ doc, storage, rail }: LayoutEnv): void {
  const root = doc.documentElement;
  const toggles = [...doc.querySelectorAll<HTMLElement>('[data-layout-toggle]')];
  const widths = [...doc.querySelectorAll<HTMLElement>('[data-layout-width]')];
  if (!toggles.length && !widths.length) return;

  const apply = (state: LayoutState) => {
    root.dataset.left = state.left;
    root.dataset.right = state.right;
    root.dataset.width = state.width;
    for (const button of toggles) {
      const side = button.dataset.layoutToggle as Side;
      const open = state[side] === 'open';
      button.setAttribute('aria-expanded', String(open));
      const label = open ? button.dataset.collapseLabel : button.dataset.expandLabel;
      if (label) button.setAttribute('aria-label', label);
      /* Plegado, el panel sigue en el DOM (se anima al volver): `inert` lo saca del tabulador y del
         árbol de accesibilidad. Solo donde hay raíl: por debajo de lg el lateral es el «Menú»
         y sus enlaces tienen que poder pulsarse, esté como esté guardado. */
      const panel = doc.getElementById(button.getAttribute('aria-controls') ?? '');
      if (open || rail?.matches === false) panel?.removeAttribute('inert');
      else panel?.setAttribute('inert', '');
    }
    for (const button of widths) {
      button.setAttribute('aria-pressed', String(button.dataset.layoutWidth === state.width));
    }
  };

  const change = (next: (state: LayoutState) => LayoutState) => {
    const state = next(readLayout(root));
    apply(state);
    safeSet(storage, LAYOUT_KEY, serializeLayout(state));
  };

  for (const button of toggles) {
    button.addEventListener('click', () =>
      change((state) => togglePanel(state, button.dataset.layoutToggle as Side)),
    );
  }
  for (const button of widths) {
    button.addEventListener('click', () =>
      change((state) => withWidth(state, widthOf(button.dataset.layoutWidth) ?? state.width)),
    );
  }

  apply(readLayout(root));
  /* Cruzar lg (girar la tableta, redimensionar) cambia si hay raíl: se recalcula `inert`. */
  rail?.addEventListener?.('change', () => apply(readLayout(root)));
}
