import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { createDiagramViewer } from './diagram-viewer';

const labels = { zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit to screen', close: 'Close' };

/** El visor ocupa una ventana de 800×600 y el diagrama mide 400×200: «ajustado» es escala 1.5 (margen 32). */
function setup() {
  const { document } = parseHTML(
    '<!doctype html><html><body><button id="trigger">abrir</button>' +
      '<div id="source"><svg id="docs-mermaid-0" viewBox="0 0 400 200" style="max-width: 400px; min-width: 300px;"><g></g></svg></div></body></html>',
  );
  const win = document.defaultView!;
  const viewer = createDiagramViewer(document, labels);
  const dialog = document.querySelector<HTMLDialogElement>('dialog.docs-diagram-dialog')!;
  Object.assign(dialog, {
    showModal: vi.fn(() => dialog.setAttribute('open', '')),
    close: vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new win.Event('close'));
    }),
  });
  const stage = dialog.querySelector<HTMLElement>('.docs-diagram-stage')!;
  const canvas = dialog.querySelector<HTMLElement>('.docs-diagram-canvas')!;
  const size = { width: 800, height: 600 };
  Object.defineProperty(stage, 'clientWidth', { get: () => size.width });
  Object.defineProperty(stage, 'clientHeight', { get: () => size.height });
  stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRect;
  stage.setPointerCapture = vi.fn();
  stage.focus = vi.fn();
  const trigger = document.querySelector<HTMLButtonElement>('#trigger')!;
  trigger.focus = vi.fn();
  const svg = document.querySelector<SVGElement>('#source svg')! as unknown as SVGElement;

  const fire = (el: Element, type: string, props: Record<string, unknown> = {}) => {
    const event = new win.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, props);
    el.dispatchEvent(event);
    return event;
  };
  const key = (k: string, extra: Record<string, unknown> = {}) =>
    fire(stage, 'keydown', { key: k, ...extra });
  /** `translate(x px, y px) scale(s)` del lienzo, ya como números. */
  const view = () => {
    const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(
      canvas.style.transform,
    )!;
    return { x: Number(m[1]), y: Number(m[2]), scale: Number(m[3]) };
  };
  const button = (label: string) =>
    dialog.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  return { document, size, viewer, dialog, stage, canvas, trigger, svg, fire, key, view, button };
}

describe('createDiagramViewer', () => {
  it('crea un único diálogo cerrado, con los botones con su nombre accesible', () => {
    const { document, button } = setup();
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    for (const label of Object.values(labels)) {
      expect(button(label).getAttribute('type')).toBe('button');
    }
  });

  it('al abrir clona el SVG (el original no se toca), nombra el diálogo y lo muestra modal', () => {
    const { viewer, dialog, canvas, svg, trigger } = setup();
    viewer.open(svg, 'Flujo de pedido', trigger);
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.getAttribute('aria-label')).toBe('Flujo de pedido');
    const clone = canvas.querySelector('svg')!;
    expect(clone).not.toBe(svg);
    expect(svg.getAttribute('style')).toContain('max-width');
    expect(viewer.isOpen).toBe(true);
  });

  it('el clon pierde los límites de ancho de la página y toma su medida natural', () => {
    const { viewer, canvas, svg, trigger } = setup();
    viewer.open(svg, 'x', trigger);
    const clone = canvas.querySelector('svg')!;
    expect(clone.getAttribute('width')).toBe('400');
    expect(clone.getAttribute('height')).toBe('200');
    expect(clone.getAttribute('style') ?? '').not.toContain('max-width');
    expect(clone.getAttribute('style') ?? '').not.toContain('min-width');
  });

  it('empieza ajustado a la pantalla y centrado', () => {
    const { viewer, view, svg, trigger } = setup();
    viewer.open(svg, 'x', trigger);
    /* (800 - 64) / 400 = 1.84 y (600 - 64) / 200 = 2.68: manda el ancho. */
    expect(view().scale).toBeCloseTo(1.84);
    expect(view().x).toBeCloseTo(32);
    expect(view().y).toBeCloseTo((600 - 200 * 1.84) / 2);
  });

  it('abrir otra vez sustituye el diagrama anterior en vez de apilarlo', () => {
    const { viewer, canvas, svg, trigger } = setup();
    viewer.open(svg, 'a', trigger);
    viewer.close();
    viewer.open(svg, 'b', trigger);
    expect(canvas.querySelectorAll('svg')).toHaveLength(1);
  });

  describe('cerrar', () => {
    it.each([
      ['el botón de cerrar', (c: ReturnType<typeof setup>) => c.fire(c.button('Close'), 'click')],
      [
        'Escape (el navegador lanza cancel y cierra)',
        (c: ReturnType<typeof setup>) => {
          c.fire(c.dialog, 'cancel');
          c.dialog.close();
        },
      ],
      [
        'un clic en el fondo, fuera del diagrama',
        (c: ReturnType<typeof setup>) => c.fire(c.stage, 'click'),
      ],
    ])('con %s cierra, devuelve el foco al botón y vacía el visor', (_, act) => {
      const ctx = setup();
      ctx.viewer.open(ctx.svg, 'x', ctx.trigger);
      act(ctx);
      expect(ctx.dialog.hasAttribute('open')).toBe(false);
      expect(ctx.trigger.focus).toHaveBeenCalled();
      expect(ctx.canvas.querySelector('svg')).toBeNull();
      expect(ctx.viewer.isOpen).toBe(false);
    });

    it('un clic sobre el propio diagrama no cierra', () => {
      const { viewer, dialog, canvas, fire, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      fire(canvas.querySelector('svg')!, 'click');
      expect(dialog.hasAttribute('open')).toBe(true);
    });

    it('close() sin visor abierto no hace nada', () => {
      const { viewer, dialog } = setup();
      viewer.close();
      expect(dialog.close).not.toHaveBeenCalled();
    });
  });

  describe('zoom', () => {
    it('los botones acercan y alejan respecto al centro y «ajustar» vuelve al inicio', () => {
      const { viewer, view, button, fire, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      const start = view();
      fire(button('Zoom in'), 'click');
      expect(view().scale).toBeGreaterThan(start.scale);
      /* El centro del visor sigue apuntando al mismo punto del diagrama. */
      const contentAtCentre = (v: typeof start) => ({
        x: (400 - v.x) / v.scale,
        y: (300 - v.y) / v.scale,
      });
      expect(contentAtCentre(view()).x).toBeCloseTo(contentAtCentre(start).x);
      fire(button('Zoom out'), 'click');
      fire(button('Zoom out'), 'click');
      expect(view().scale).toBeLessThan(start.scale);
      fire(button('Fit to screen'), 'click');
      expect(view()).toEqual(start);
    });

    it('con el teclado: + acerca, - aleja, 0 ajusta', () => {
      const { viewer, view, key, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      const start = view().scale;
      key('+');
      expect(view().scale).toBeGreaterThan(start);
      key('=');
      key('-');
      key('-');
      key('-');
      expect(view().scale).toBeLessThan(start);
      key('0');
      expect(view().scale).toBeCloseTo(start);
    });

    it('el zoom nunca sale de 0.25× a 8×', () => {
      const { viewer, view, key, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      for (let i = 0; i < 40; i++) key('+');
      expect(view().scale).toBe(8);
      for (let i = 0; i < 80; i++) key('-');
      expect(view().scale).toBe(0.25);
    });

    it('la rueda hace zoom centrado en el puntero y no desplaza la página', () => {
      const { viewer, view, fire, stage, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      const before = view();
      const pointer = { clientX: 600, clientY: 100 };
      const event = fire(stage, 'wheel', { deltaY: -100, deltaMode: 0, ...pointer });
      expect(event.defaultPrevented).toBe(true);
      const after = view();
      expect(after.scale).toBeGreaterThan(before.scale);
      expect((600 - after.x) / after.scale).toBeCloseTo((600 - before.x) / before.scale);
      expect((100 - after.y) / after.scale).toBeCloseTo((100 - before.y) / before.scale);
    });
  });

  describe('desplazamiento', () => {
    it('las flechas mueven la vista (la flecha derecha mira hacia la derecha: el diagrama se va a la izquierda)', () => {
      const { viewer, view, key, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      const start = view();
      key('ArrowRight');
      expect(view().x).toBeLessThan(start.x);
      expect(view().y).toBe(start.y);
      key('ArrowDown');
      expect(view().y).toBeLessThan(start.y);
      key('ArrowLeft');
      key('ArrowLeft');
      expect(view().x).toBeGreaterThan(start.x);
      key('ArrowUp');
      key('ArrowUp');
      expect(view().y).toBeGreaterThan(start.y);
    });

    it('arrastrar con el puntero mueve el diagrama lo que se arrastra', () => {
      const { viewer, view, fire, stage, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      const start = view();
      fire(stage, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
      fire(stage, 'pointermove', { pointerId: 1, clientX: 130, clientY: 90 });
      fire(stage, 'pointerup', { pointerId: 1, clientX: 130, clientY: 90 });
      expect(view().x).toBeCloseTo(start.x + 30);
      expect(view().y).toBeCloseTo(start.y - 10);
      expect(view().scale).toBe(start.scale);
    });

    it('mover el puntero sin pulsar no arrastra', () => {
      const { viewer, view, fire, stage, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      const start = view();
      fire(stage, 'pointermove', { pointerId: 1, clientX: 300, clientY: 300 });
      expect(view()).toEqual(start);
    });

    it('un arrastre que acaba en clic no cierra el visor, pero un clic suelto sí', () => {
      const { viewer, dialog, fire, stage, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      fire(stage, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
      fire(stage, 'pointermove', { pointerId: 1, clientX: 160, clientY: 100 });
      fire(stage, 'pointerup', { pointerId: 1, clientX: 160, clientY: 100 });
      fire(stage, 'click');
      expect(dialog.hasAttribute('open')).toBe(true);
      fire(stage, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
      fire(stage, 'pointerup', { pointerId: 1, clientX: 100, clientY: 100 });
      fire(stage, 'click');
      expect(dialog.hasAttribute('open')).toBe(false);
    });

    it('pellizcar con dos dedos hace zoom', () => {
      const { viewer, view, fire, stage, svg, trigger } = setup();
      viewer.open(svg, 'x', trigger);
      const start = view().scale;
      fire(stage, 'pointerdown', { pointerId: 1, clientX: 300, clientY: 300 });
      fire(stage, 'pointerdown', { pointerId: 2, clientX: 400, clientY: 300 });
      fire(stage, 'pointermove', { pointerId: 2, clientX: 500, clientY: 300 });
      expect(view().scale).toBeGreaterThan(start);
      const mid = view().scale;
      fire(stage, 'pointermove', { pointerId: 2, clientX: 400, clientY: 300 });
      expect(view().scale).toBeLessThan(mid);
    });
  });

  it('si la ventana cambia de tamaño sin que se haya tocado la vista, se vuelve a ajustar', () => {
    const { document, size, viewer, view, svg, trigger } = setup();
    viewer.open(svg, 'x', trigger);
    size.width = 400;
    document.defaultView!.dispatchEvent(new document.defaultView!.Event('resize'));
    expect(view().scale).toBeCloseTo((400 - 64) / 400);
  });

  it('si el usuario ya movió la vista, un cambio de tamaño no la pisa', () => {
    const { document, size, viewer, view, key, svg, trigger } = setup();
    viewer.open(svg, 'x', trigger);
    key('+');
    const before = view();
    size.width = 400;
    document.defaultView!.dispatchEvent(new document.defaultView!.Event('resize'));
    expect(view()).toEqual(before);
  });
});
