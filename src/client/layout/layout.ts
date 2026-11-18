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

function panelOf(value: unknown): PanelState | undefined {
  return PANEL_STATES.find((state) => state === value);
}
function widthOf(value: unknown): LayoutWidth | undefined {
  return WIDTHS.find((width) => width === value);
}

/** Lo guardado campo a campo: un valor ausente o inválido cae al de `fallback`; lo que no sea un objeto JSON es «nada guardado». */
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

/** Script en línea (no puede importar, por eso es cadena) que restaura el estado guardado antes del primer pintado; con `toggles: false` no hay script. */
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
  htmlDocument: Document;
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

/** Cablea los botones de plegado y de ancho; la fuente de verdad es `<html data-left data-right data-width>`. */
export function initLayout({ htmlDocument, storage, rail }: LayoutEnv): void {
  const root = htmlDocument.documentElement;
  const toggles = [...htmlDocument.querySelectorAll<HTMLElement>('[data-layout-toggle]')];
  const widths = [...htmlDocument.querySelectorAll<HTMLElement>('[data-layout-width]')];
  if (!toggles.length && !widths.length) return;

  function apply(state: LayoutState) {
    root.dataset.left = state.left;
    root.dataset.right = state.right;
    root.dataset.width = state.width;
    for (const button of toggles) {
      const side = button.dataset.layoutToggle as Side;
      const open = state[side] === 'open';
      button.setAttribute('aria-expanded', String(open));
      const label = open ? button.dataset.collapseLabel : button.dataset.expandLabel;
      if (label) button.setAttribute('aria-label', label);
      /* `inert` solo donde hay raíl: por debajo de lg el lateral es el «Menú» y sus enlaces deben poder pulsarse. */
      const panel = htmlDocument.getElementById(button.getAttribute('aria-controls') ?? '');
      if (open || rail?.matches === false) panel?.removeAttribute('inert');
      else panel?.setAttribute('inert', '');
    }
    for (const button of widths) {
      button.setAttribute('aria-pressed', String(button.dataset.layoutWidth === state.width));
    }
  }

  function change(next: (state: LayoutState) => LayoutState) {
    const state = next(readLayout(root));
    apply(state);
    safeSet(storage, LAYOUT_KEY, serializeLayout(state));
  }

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
