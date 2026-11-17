/**
 * La matemática del visor de diagramas a pantalla completa, sin DOM. Una vista es la
 * transformación `translate(x, y) scale(scale)` con origen arriba a la izquierda aplicada al
 * contenido; `x` e `y` son píxeles del visor. Todas las funciones devuelven una vista nueva.
 */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Límites del zoom: a 0.25× un diagrama grande aún se ve entero; a 8× se lee el trazo fino. */
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 8;

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Ancho y alto naturales de un `viewBox`; `undefined` si no da medidas válidas. */
export function viewBoxSize(viewBox: string | null): Size | undefined {
  const [, , width, height] = (viewBox?.trim().split(/[\s,]+/) ?? []).map(Number);
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  if (width <= 0 || height <= 0) return undefined;
  return { width, height };
}

/** La vista que centra el contenido entero en el visor, con `margin` px de aire por cada lado. */
export function fitView(content: Size, viewport: Size, margin = 32): View {
  const scale = clampScale(
    Math.min(
      (viewport.width - 2 * margin) / content.width,
      (viewport.height - 2 * margin) / content.height,
    ),
  );
  return {
    scale,
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
  };
}

/**
 * Multiplica el zoom por `factor` manteniendo quieto el punto `at` (en coordenadas del visor): el
 * trozo de diagrama que está bajo el cursor sigue ahí. Si el zoom ya está en el tope, no cambia nada.
 */
export function zoomAt(view: View, factor: number, at: Point): View {
  const scale = clampScale(view.scale * factor);
  const ratio = scale / view.scale;
  if (ratio === 1) return view;
  return { scale, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio };
}

export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, x: view.x + dx, y: view.y + dy };
}

/** Píxeles que equivale una línea / una página de `WheelEvent.deltaMode`. */
const LINE_PX = 16;
const PAGE_PX = 100;
/** Un solo gesto de rueda no cambia el zoom más que esto: evita saltos con ruedas «de golpe». */
const MAX_WHEEL_PX = 100;

/** El factor de zoom de un evento de rueda; con `pinch` (ctrl+rueda, el pellizco del trackpad) es más fino. */
export function wheelFactor(deltaY: number, deltaMode = 0, pinch = false): number {
  const px = deltaY * (deltaMode === 1 ? LINE_PX : deltaMode === 2 ? PAGE_PX : 1);
  const clamped = Math.max(-MAX_WHEEL_PX, Math.min(MAX_WHEEL_PX, px));
  return Math.exp(-clamped * (pinch ? 0.01 : 0.002));
}
