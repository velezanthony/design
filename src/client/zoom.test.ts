import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { initZoom, isZoomable } from './zoom';

const labels = { open: 'Enlarge image: {alt}', close: 'Close' };

const img = (attrs: string, inside = '') =>
  parseHTML(
    `<div class="prose">${inside}<img src="/a.png" ${attrs}>${inside ? '</a>' : ''}</div>`,
  ).document.querySelector('img')!;

describe('isZoomable', () => {
  it('acepta una imagen con texto alternativo', () => {
    expect(isZoomable(img('alt="Diagrama"'))).toBe(true);
    expect(isZoomable(img('alt="Diagrama" width="800" height="400"'))).toBe(true);
  });

  it.each([
    ['sin alt', ''],
    ['alt vacío (decorativa)', 'alt=""'],
    ['alt en blanco', 'alt="  "'],
    ['diminuta por su ancho', 'alt="Icono" width="24" height="24"'],
    ['diminuta por su alto', 'alt="Línea" width="800" height="10"'],
    ['con exclusión explícita', 'alt="Logo" data-no-zoom'],
  ])('descarta una imagen %s', (_, attrs) => {
    expect(isZoomable(img(attrs))).toBe(false);
  });

  it('descarta una imagen dentro de un enlace, que ya tiene su propia acción', () => {
    expect(isZoomable(img('alt="Insignia"', '<a href="/x">'))).toBe(false);
  });
});

describe('initZoom', () => {
  const page = (body: string, api?: (update: () => void | Promise<void>) => unknown) => {
    const { document } = parseHTML(
      `<!doctype html><html><body><main><div class="prose">${body}</div></main></body></html>`,
    );
    if (api) Object.assign(document, { startViewTransition: api });
    return document;
  };
  const figure = '<p><img src="/a.png" alt="Diagrama" width="800" height="400"></p>';

  /** Cablea la página y sustituye lo que linkedom no implementa de `<dialog>`. */
  function setup(
    body = figure,
    { api = false, reduced = false }: { api?: boolean; reduced?: boolean } = {},
  ) {
    const names: string[] = [];
    const start = vi.fn((update: () => void | Promise<void>) => {
      const thumb = document.querySelector('.prose img');
      const big = document.querySelector('dialog img');
      names.push(
        `before:${thumb?.getAttribute('style') ?? ''}|${big?.getAttribute('style') ?? ''}`,
      );
      return {
        finished: Promise.resolve(update()).then(() => {
          names.push(
            `after:${thumb?.getAttribute('style') ?? ''}|${big?.getAttribute('style') ?? ''}`,
          );
        }),
      };
    });
    const document = page(body, api ? start : undefined);
    initZoom(document, { labels, motion: { matches: reduced } });

    const dialog = document.querySelector<HTMLDialogElement>('dialog.docs-zoom-dialog') ?? null;
    if (dialog) {
      Object.assign(dialog, {
        showModal: vi.fn(() => dialog.setAttribute('open', '')),
        close: vi.fn(() => {
          dialog.removeAttribute('open');
          dialog.dispatchEvent(new document.defaultView!.Event('close'));
        }),
      });
    }
    const trigger = document.querySelector<HTMLButtonElement>('button.docs-zoom');
    if (trigger) trigger.focus = vi.fn();
    const Event = document.defaultView!.Event;
    const fire = (el: Element, type: string, init: EventInit = { bubbles: true }) => {
      const e = new Event(type, { cancelable: true, ...init });
      el.dispatchEvent(e);
      return e;
    };
    const settle = () => new Promise((resolve) => setTimeout(resolve));
    return { document, dialog: dialog!, trigger: trigger!, fire, start, names, settle };
  }

  it('envuelve la imagen en un botón accesible con el alt en su nombre', () => {
    const { document, trigger } = setup();
    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.getAttribute('aria-label')).toBe('Enlarge image: Diagrama');
    expect(trigger.querySelector('img')).toBe(document.querySelector('.prose img'));
    expect(document.querySelector('.prose p')!.firstElementChild).toBe(trigger);
  });

  it('no toca imágenes que no se pueden ampliar ni crea el diálogo si no hay ninguna', () => {
    const { document } = setup(
      '<img src="/d.png" alt=""><a href="/x"><img src="/b.png" alt="Insignia"></a>',
    );
    expect(document.querySelector('button.docs-zoom')).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('solo mejora imágenes del contenido, no las del resto de la página', () => {
    const { document } = parseHTML(
      '<!doctype html><html><body><header><img src="/l.png" alt="Logo"></header></body></html>',
    );
    initZoom(document, { labels, motion: { matches: false } });
    expect(document.querySelector('button.docs-zoom')).toBeNull();
  });

  it('es idempotente', () => {
    const { document } = setup();
    initZoom(document, { labels, motion: { matches: false } });
    expect(document.querySelectorAll('button.docs-zoom')).toHaveLength(1);
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
  });

  it('al pulsar abre el diálogo modal con la imagen y su texto alternativo', () => {
    const { dialog, trigger, fire } = setup();
    fire(trigger, 'click');
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Diagrama');
    const big = dialog.querySelector('img')!;
    expect(big.getAttribute('src')).toBe('/a.png');
    expect(big.getAttribute('alt')).toBe('Diagrama');
  });

  it('el botón de cerrar lleva su nombre accesible', () => {
    const { dialog } = setup();
    expect(dialog.querySelector('button.docs-zoom-close')!.getAttribute('aria-label')).toBe(
      'Close',
    );
  });

  describe.each([
    ['el botón de cerrar', (d: HTMLElement) => d.querySelector('.docs-zoom-close')!, 'click'],
    ['un clic en el fondo', (d: HTMLElement) => d, 'click'],
    ['un clic en la imagen', (d: HTMLElement) => d.querySelector('.docs-zoom-img')!, 'click'],
  ])('se cierra con %s', (_, target, type) => {
    it('y devuelve el foco al botón que lo abrió', async () => {
      const { dialog, trigger, fire, settle } = setup();
      fire(trigger, 'click');
      fire(target(dialog), type);
      await settle();
      expect(dialog.close).toHaveBeenCalledOnce();
      expect(dialog.hasAttribute('open')).toBe(false);
      expect(trigger.focus).toHaveBeenCalledOnce();
    });
  });

  it('Escape (el evento cancel) cierra con nuestra animación en vez de la nativa', async () => {
    const { dialog, trigger, fire, settle } = setup();
    fire(trigger, 'click');
    const e = fire(dialog, 'cancel', {});
    await settle();
    expect(e.defaultPrevented).toBe(true);
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(trigger.focus).toHaveBeenCalledOnce();
  });

  it('si el navegador lo cierra por su cuenta, el foco también vuelve', () => {
    const { dialog, trigger, fire } = setup();
    fire(trigger, 'click');
    dialog.removeAttribute('open');
    fire(dialog, 'close', {});
    expect(trigger.focus).toHaveBeenCalledOnce();
  });

  it('cada imagen devuelve el foco a su propio botón', async () => {
    const { document, dialog, fire, settle } = setup(
      `${figure}<p><img src="/b.png" alt="Otra" width="800" height="400"></p>`,
    );
    const [, second] = document.querySelectorAll<HTMLButtonElement>('button.docs-zoom');
    second!.focus = vi.fn();
    fire(second!, 'click');
    expect(dialog.querySelector('img')!.getAttribute('src')).toBe('/b.png');
    fire(dialog, 'click');
    await settle();
    expect(second!.focus).toHaveBeenCalledOnce();
  });

  describe('con View Transitions', () => {
    it('hace que la miniatura se convierta en la imagen grande y la limpia al acabar', async () => {
      const { dialog, trigger, fire, start, names, settle } = setup(figure, { api: true });
      fire(trigger, 'click');
      await settle();
      expect(start).toHaveBeenCalledOnce();
      /* «Antes»: solo la miniatura tiene nombre. «Después»: solo la imagen grande. Al acabar, ninguna. */
      expect(names[0]).toMatch(/^before:view-transition-name: ?docs-zoom;?\|$/);
      expect(names[1]).toMatch(/^after:\|view-transition-name: ?docs-zoom;?$/);
      expect(dialog.querySelector('img')!.getAttribute('style') ?? '').not.toContain('docs-zoom');
      expect(dialog.hasAttribute('open')).toBe(true);
    });

    it('al cerrar el nombre pasa de la imagen grande a la miniatura', async () => {
      const { trigger, dialog, fire, names, settle } = setup(figure, { api: true });
      fire(trigger, 'click');
      await settle();
      names.length = 0;
      fire(dialog, 'click');
      await settle();
      expect(names[0]).toMatch(/^before:\|view-transition-name: ?docs-zoom;?$/);
      /* El `close` simulado limpia la miniatura al instante; lo que importa es que la grande ya no lo lleva. */
      expect(names[1]).toMatch(/\|$/);
    });

    it('con movimiento reducido abre y cierra sin la API', async () => {
      const { dialog, trigger, fire, start, settle } = setup(figure, { api: true, reduced: true });
      fire(trigger, 'click');
      expect(start).not.toHaveBeenCalled();
      expect(dialog.hasAttribute('open')).toBe(true);
      fire(dialog, 'click');
      await settle();
      expect(start).not.toHaveBeenCalled();
      expect(dialog.hasAttribute('open')).toBe(false);
    });

    it('sin la API abre y cierra igual y no deja nombres puestos', async () => {
      const { document, dialog, trigger, fire, settle } = setup();
      fire(trigger, 'click');
      fire(dialog, 'click');
      await settle();
      expect(document.querySelector('.prose img')!.getAttribute('style') ?? '').not.toContain(
        'view-transition-name',
      );
    });
  });
});
