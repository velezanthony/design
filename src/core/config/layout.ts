/** Estado de una columna lateral. Mismas cadenas en la config, en `<html data-left>` y en el almacenamiento. */
export const PanelState = { OPEN: 'open', COLLAPSED: 'collapsed' } as const;
export type PanelState = (typeof PanelState)[keyof typeof PanelState];

/** Ancho de la página: `reading` conserva la medida cómoda; `full` aprovecha toda la ventana. */
export const LayoutWidth = { READING: 'reading', FULL: 'full' } as const;
export type LayoutWidth = (typeof LayoutWidth)[keyof typeof LayoutWidth];

/** Lo que el consumidor puede escribir en `layout`: todo es opcional. */
export interface LayoutUserConfig {
  /** Estado inicial de la barra lateral de navegación (desde `lg`). */
  sidebar?: PanelState;
  /** Estado inicial del índice «En esta página» (desde `xl`). */
  toc?: PanelState;
  width?: LayoutWidth;
  /** `false` quita todos los controles e ignora lo que el visitante dejó guardado. */
  toggles?: boolean;
}

export type ResolvedLayout = Required<LayoutUserConfig>;

export const DEFAULT_LAYOUT: ResolvedLayout = {
  sidebar: PanelState.OPEN,
  toc: PanelState.OPEN,
  width: LayoutWidth.READING,
  toggles: true,
};

/** Completa lo que el consumidor no declaró con los valores por defecto. */
export function resolveLayout(user: LayoutUserConfig = {}): ResolvedLayout {
  return {
    sidebar: user.sidebar ?? DEFAULT_LAYOUT.sidebar,
    toc: user.toc ?? DEFAULT_LAYOUT.toc,
    width: user.width ?? DEFAULT_LAYOUT.width,
    toggles: user.toggles ?? DEFAULT_LAYOUT.toggles,
  };
}
