import {
  fitView,
  panBy,
  viewBoxSize,
  wheelFactor,
  zoomAt,
  type Point,
  type Size,
  type View,
} from './diagram-view';

export interface DiagramViewerLabels {
  zoomIn: string;
  zoomOut: string;
  /** «Ajustar a la pantalla»: vuelve a la vista inicial. */
  fit: string;
  close: string;
}

export interface DiagramViewer {
  /** Abre una copia de `svg` a pantalla completa; al cerrar, el foco vuelve a `trigger`. */
  open(svg: SVGElement, name: string, trigger: HTMLElement): void;
  close(): void;
  readonly isOpen: boolean;
}

/** Cuánto acercan o alejan los botones y las teclas `+` / `-` de cada pulsación. */
const STEP = 1.25;
/** Lo que desplaza una flecha, en px del visor. */
const PAN_STEP = 48;
/** A partir de cuántos px un gesto deja de ser un clic y pasa a ser un arrastre. */
const DRAG_THRESHOLD = 4;
/** Medida de reserva si el SVG no declara `viewBox` y el navegador no sabe medirlo. */
const FALLBACK_SIZE: Size = { width: 800, height: 600 };

/* Iconos de trazo (heredan `currentColor`), para que sigan el color del tema y no dependan de la
   fuente: «−», «+» y «×» como texto cambian de tamaño y alineación según la tipografía. */
function icon(paths: string) {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}
export const ICONS = {
  zoomIn: icon('<path d="M12 5v14M5 12h14"/>'),
  zoomOut: icon('<path d="M5 12h14"/>'),
  fit: icon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  close: icon('<path d="M6 6l12 12M18 6L6 18"/>'),
  expand: icon('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
};

/**
 * El visor a pantalla completa de los diagramas: un `<dialog>` modal (el mismo patrón que la
 * ampliación de imágenes: Escape, botón de cerrar o clic fuera lo cierran y el foco vuelve al
 * botón que lo abrió) con un lienzo que se mueve y escala con `transform`.
 *
 * - Zoom: botones, `+` `-` `0`, rueda (centrada en el puntero) y pellizco con dos dedos.
 * - Mover: arrastrar con ratón o dedo (eventos de puntero) y flechas, que mueven la VISTA: la
 *   flecha derecha mira hacia la derecha y el diagrama se desplaza a la izquierda.
 * - Empieza ajustado a la pantalla y, mientras nadie toca la vista, vuelve a ajustarse si la
 *   ventana cambia de tamaño.
 *
 * Trabaja sobre un CLON del SVG ya dibujado, así que respeta el tema vigente al abrir. Si el tema
 * cambia con el visor abierto, quien lo gobierna (`initMermaid`) lo cierra: el clon quedaría con
 * los colores viejos y reabrirlo es un clic.
 */
export function createDiagramViewer(doc: Document, labels: DiagramViewerLabels): DiagramViewer {
  const dialog = doc.createElement('dialog');
  dialog.className = 'docs-zoom-dialog docs-diagram-dialog';

  const stage = doc.createElement('div');
  stage.className = 'docs-diagram-stage';
  /* Tiene que poder recibir foco para que las teclas lleguen a él y no a la página de detrás. */
  stage.tabIndex = 0;
  const canvas = doc.createElement('div');
  canvas.className = 'docs-diagram-canvas';
  stage.append(canvas);

  const toolbar = doc.createElement('div');
  toolbar.className = 'docs-diagram-toolbar';
  function tool(label: string, svg: string, run: () => void) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'docs-diagram-tool';
    button.setAttribute('aria-label', label);
    button.innerHTML = svg;
    button.addEventListener('click', run);
    toolbar.append(button);
  }

  dialog.append(stage, toolbar);
  doc.body.append(dialog);

  let current: { trigger: HTMLElement; content: Size } | undefined;
  let view: View = { scale: 1, x: 0, y: 0 };
  /** Verdadero mientras la vista es la inicial: solo entonces un cambio de ventana la reajusta. */
  let fitted = true;

  function viewport(): Size {
    return { width: stage.clientWidth, height: stage.clientHeight };
  }
  function centre(): Point {
    return { x: viewport().width / 2, y: viewport().height / 2 };
  }

  function apply(next: View, userMoved = true) {
    view = next;
    if (userMoved) fitted = false;
    canvas.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
  }
  function fit() {
    if (!current) return;
    apply(fitView(current.content, viewport()), false);
    fitted = true;
  }
  function zoom(factor: number, at: Point = centre()) {
    return apply(zoomAt(view, factor, at));
  }

  /** Coordenadas del visor (no de la ventana) de un evento de puntero. */
  function local(event: { clientX: number; clientY: number }): Point {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  tool(labels.zoomOut, ICONS.zoomOut, () => zoom(1 / STEP));
  tool(labels.zoomIn, ICONS.zoomIn, () => zoom(STEP));
  tool(labels.fit, ICONS.fit, fit);
  tool(labels.close, ICONS.close, () => close());

  function close() {
    if (current && dialog.hasAttribute('open')) dialog.close();
  }

  /* Pasa siempre que el diálogo se cierra, también si lo cierra el navegador (Escape). */
  dialog.addEventListener('close', () => {
    if (!current) return;
    const { trigger } = current;
    current = undefined;
    canvas.replaceChildren();
    pointers.clear();
    trigger.focus();
  });

  dialog.addEventListener('keydown', (event) => {
    const { key } = event;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (key === '+' || key === '=') zoom(STEP);
    else if (key === '-' || key === '_') zoom(1 / STEP);
    else if (key === '0') fit();
    else if (key in arrows) {
      const [dx, dy] = arrows[key]!;
      apply(panBy(view, -dx * PAN_STEP, -dy * PAN_STEP));
    } else return;
    event.preventDefault();
  });

  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoom(wheelFactor(event.deltaY, event.deltaMode, event.ctrlKey), local(event));
    },
    { passive: false },
  );

  /* Punteros activos: con uno se arrastra, con dos se pellizca. */
  const pointers = new Map<number, Point>();
  let dragged = 0;
  let moved = false;

  function pair() {
    const [first, second] = [...pointers.values()];
    return {
      distance: Math.hypot(second!.x - first!.x, second!.y - first!.y),
      mid: { x: (first!.x + second!.x) / 2, y: (first!.y + second!.y) / 2 },
    };
  }

  stage.addEventListener('pointerdown', (event) => {
    if (event.button) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      dragged = 0;
      moved = false;
    } else moved = true;
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      /* Sin captura el arrastre funciona igual mientras el puntero siga sobre el visor. */
    }
    stage.dataset.dragging = '';
  });

  stage.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    if (pointers.size >= 2) {
      const before = pair();
      pointers.set(event.pointerId, next);
      const after = pair();
      const rect = stage.getBoundingClientRect();
      const at = { x: after.mid.x - rect.left, y: after.mid.y - rect.top };
      const shifted = panBy(view, after.mid.x - before.mid.x, after.mid.y - before.mid.y);
      apply(before.distance > 0 ? zoomAt(shifted, after.distance / before.distance, at) : shifted);
      return;
    }
    pointers.set(event.pointerId, next);
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    dragged += Math.abs(dx) + Math.abs(dy);
    if (dragged > DRAG_THRESHOLD) moved = true;
    apply(panBy(view, dx, dy));
  });

  function release(event: { pointerId: number }) {
    pointers.delete(event.pointerId);
    if (!pointers.size) delete stage.dataset.dragging;
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  /* Clic fuera del diagrama = cerrar, como en la ampliación de imágenes; pero el clic que suelta
     un arrastre no cuenta, o cada vez que se moviera el diagrama se cerraría. */
  dialog.addEventListener('click', (event) => {
    if (moved) {
      moved = false;
      return;
    }
    if (event.target === dialog || event.target === stage) close();
  });

  doc.defaultView?.addEventListener('resize', () => {
    if (current && fitted) fit();
  });

  return {
    open(svg, name, trigger) {
      if (current) return;
      const clone = svg.cloneNode(true) as SVGElement;
      /* El límite de ancho de la columna no vale aquí: el diagrama se mide a su tamaño natural y
         el zoom lo escala. */
      clone.style.removeProperty('max-width');
      clone.style.removeProperty('min-width');
      const content =
        viewBoxSize(clone.getAttribute('viewBox')) ??
        (() => {
          const box = svg.getBoundingClientRect();
          return box.width > 0 && box.height > 0
            ? { width: box.width, height: box.height }
            : FALLBACK_SIZE;
        })();
      clone.setAttribute('width', String(content.width));
      clone.setAttribute('height', String(content.height));
      canvas.replaceChildren(clone);

      current = { trigger, content };
      dialog.setAttribute('aria-label', name);
      dialog.showModal();
      fit();
      stage.focus();
    },
    close,
    get isOpen() {
      return current !== undefined;
    },
  };
}
