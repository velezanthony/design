import { SIDEBAR_SCROLL_KEY, safeSet } from '../preferences/storage';
import type { RailQuery } from './layout';
import { RAIL_QUERY } from './rail';

/** Un tramo vertical en coordenadas del contenido (desde el inicio de lo desplazable). */
export interface Span {
  top: number;
  height: number;
}

/** Lo guardado, si es un desplazamiento válido (número finito y no negativo); si no, «nada guardado». */
export function parseScroll(stored: string | null | undefined): number | undefined {
  if (stored === null || stored === undefined || stored.trim() === '') return undefined;
  const value = Number(stored);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** `true` si el item cabe entero en el tramo que se ve. */
export function isVisible(item: Span, view: Span): boolean {
  return item.top >= view.top && item.top + item.height <= view.top + view.height;
}

/** `scrollTop` inicial de la barra: lo guardado si deja a la vista la página actual (`current`, en coordenadas del contenido) y, si no, centra la entrada actual. */
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

/** Script en línea que restaura el scroll de la barra; va en una función porque `top` es de solo lectura en `window` y un `var` suelto no lo asignaría. */
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
  htmlDocument: Document;
  /** `sessionStorage`: la posición vale para esta pestaña, no para la siguiente visita. */
  storage: Storage | undefined;
  browserWindow: Pick<Window, 'addEventListener'>;
  /** Sin él se asume que el raíl existe (escritorio). */
  rail?: Pick<RailQuery, 'matches'>;
}

/** Guarda el scroll de la barra al salir y al pulsar uno de sus enlaces; por debajo de lg o con el raíl plegado conserva lo ya guardado. */
export function initSidebarScroll({
  htmlDocument,
  storage,
  browserWindow,
  rail,
}: SidebarScrollEnv): void {
  const foundBox = htmlDocument.querySelector<HTMLElement>('[data-docs-sidebar-scroll]');
  if (!foundBox) return;
  /* `save` es una declaración y no hereda el descarte de `null`: se fija en una constante. */
  const box = foundBox;

  function save() {
    if (rail?.matches === false || htmlDocument.documentElement.dataset.left === 'collapsed')
      return;
    safeSet(storage, SIDEBAR_SCROLL_KEY, String(Math.round(box.scrollTop)));
  }

  box.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest?.('a')) save();
  });
  browserWindow.addEventListener('pagehide', save);
}
