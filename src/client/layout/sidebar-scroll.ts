import { SIDEBAR_SCROLL_KEY, safeSet } from '../preferences/storage';
import type { RailQuery } from './layout';
import { RAIL_QUERY } from './rail';

/** Un tramo vertical en coordenadas del contenido (desde el inicio de lo desplazable). */
export interface Span {
  top: number;
  height: number;
}

/**
 * Lo guardado, si es un desplazamiento válido: un número finito y no negativo. Cualquier otra
 * cosa (vacío, basura, `-5`, `12px`) es «nada guardado».
 */
export function parseScroll(stored: string | null | undefined): number | undefined {
  if (stored === null || stored === undefined || stored.trim() === '') return undefined;
  const value = Number(stored);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** `true` si el item cabe entero en el tramo que se ve. */
export function isVisible(item: Span, view: Span): boolean {
  return item.top >= view.top && item.top + item.height <= view.top + view.height;
}

/**
 * El `scrollTop` que debe tener la barra al cargar. Lo guardado manda mientras deje a la vista la
 * página actual; si no hay nada guardado o la dejaría fuera, se centra la entrada actual. Sin
 * ninguna de las dos no hay nada que aplicar (`undefined`). `current` va en coordenadas del
 * contenido, no de la ventana.
 */
export function targetScroll({
  stored,
  container,
  current,
}: {
  stored: number | undefined;
  container: { height: number };
  current: Span | undefined;
}): number | undefined {
  if (
    stored !== undefined &&
    (!current || isVisible(current, { top: stored, height: container.height }))
  ) {
    return stored;
  }
  if (!current) return undefined;
  return Math.max(0, current.top - (container.height - current.height) / 2);
}

/**
 * Código del script en línea que restaura el desplazamiento de la barra antes del primer pintado,
 * para que al cambiar de página no vuelva arriba sin que se vea el salto. Va en línea y no puede
 * importar, así que se arma con el texto de las funciones probadas de este módulo. Usa `document`,
 * `sessionStorage` y `matchMedia` globales. Solo actúa desde lg y con el raíl desplegado; con el
 * almacenamiento bloqueado queda el centrado de la entrada actual. Va envuelto en una función:
 * un `var` suelto en un script clásico es global, y `top` (como `name`) es de solo lectura en
 * `window`, así que asignarlo no hace nada.
 */
export function sidebarScrollScript(): string {
  return `(function () {
try {
  var parseScroll = ${parseScroll.toString()};
  var isVisible = ${isVisible.toString()};
  var targetScroll = ${targetScroll.toString()};
  var box = document.querySelector('[data-docs-sidebar-scroll]');
  if (box && matchMedia(${JSON.stringify(RAIL_QUERY)}).matches && document.documentElement.dataset.left !== 'collapsed') {
    var stored;
    try { stored = sessionStorage.getItem(${JSON.stringify(SIDEBAR_SCROLL_KEY)}); } catch (e) { stored = null; }
    var link = box.querySelector('[aria-current="page"]');
    var current;
    if (link) {
      var rect = link.getBoundingClientRect();
      current = { top: rect.top - box.getBoundingClientRect().top + box.scrollTop, height: rect.height };
    }
    var target = targetScroll({ stored: parseScroll(stored), container: { height: box.clientHeight }, current: current });
    if (target !== undefined) box.scrollTop = target;
  }
} catch (e) {
  /* Sin la barra, sin medios o sin almacenamiento: la página se queda como llega. */
}
})();`;
}

export interface SidebarScrollEnv {
  doc: Document;
  /** `sessionStorage`: la posición vale para esta pestaña, no para la siguiente visita. */
  storage: Storage | undefined;
  win: Pick<Window, 'addEventListener'>;
  /** Sin él se asume que el raíl existe (escritorio). */
  rail?: Pick<RailQuery, 'matches'>;
}

/**
 * Guarda el desplazamiento de la barra al salir de la página (`pagehide`) y al pulsar uno de sus
 * enlaces, para que el script previo al pintado de la página siguiente lo restaure. Por debajo de
 * lg, o con el raíl plegado, no guarda: lo ya guardado se conserva.
 */
export function initSidebarScroll({ doc, storage, win, rail }: SidebarScrollEnv): void {
  const foundBox = doc.querySelector<HTMLElement>('[data-docs-sidebar-scroll]');
  if (!foundBox) return;
  /* `save` es una declaración y no hereda el descarte de `null`: se fija en una constante. */
  const box = foundBox;

  function save() {
    if (rail?.matches === false || doc.documentElement.dataset.left === 'collapsed') return;
    safeSet(storage, SIDEBAR_SCROLL_KEY, String(Math.round(box.scrollTop)));
  }

  box.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest?.('a')) save();
  });
  win.addEventListener('pagehide', save);
}
