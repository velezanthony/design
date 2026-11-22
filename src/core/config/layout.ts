/** El H1 es el título de la página, así que el índice «En esta página» empieza en H2; por defecto llega hasta H3. */
export const DEFAULT_TOC_DEPTH = 3;

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
  /** Último nivel de encabezado que lista el índice, de 2 a 6 (por defecto 3: h2 y h3). */
  tocDepth?: number;
  /** Altura máxima del índice como longitud CSS (`60vh`); pasada, la lista hace scroll. Sin ella no hay límite. */
  tocMaxHeight?: string;
}

export type ResolvedLayout = Required<Omit<LayoutUserConfig, 'tocMaxHeight'>> &
  Pick<LayoutUserConfig, 'tocMaxHeight'>;

export const DEFAULT_LAYOUT: ResolvedLayout = {
  sidebar: PanelState.OPEN,
  toc: PanelState.OPEN,
  width: LayoutWidth.READING,
  toggles: true,
  tocDepth: DEFAULT_TOC_DEPTH,
};

/** Completa lo que el consumidor no declaró con los valores por defecto. */
export function resolveLayout(user: LayoutUserConfig = {}): ResolvedLayout {
  return {
    sidebar: user.sidebar ?? DEFAULT_LAYOUT.sidebar,
    toc: user.toc ?? DEFAULT_LAYOUT.toc,
    width: user.width ?? DEFAULT_LAYOUT.width,
    toggles: user.toggles ?? DEFAULT_LAYOUT.toggles,
    tocDepth: user.tocDepth ?? DEFAULT_LAYOUT.tocDepth,
    ...(user.tocMaxHeight !== undefined && { tocMaxHeight: user.tocMaxHeight }),
  };
}
