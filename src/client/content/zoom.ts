import { withTransition, type MotionPreference } from '../transition';
import { fill } from '../text';

export interface ZoomLabels {
  /** Nombre accesible del botón de cada imagen; lleva `{alt}`. */
  open: string;
  close: string;
}

export interface ZoomOptions {
  labels: ZoomLabels;
  motion?: MotionPreference;
}

/** El nombre que comparten la miniatura y la imagen grande: así el navegador las hace una sola. */
const NAME = 'docs-zoom';

/** Por debajo de este lado declarado (px) una imagen es un icono o una línea: no se amplía. */
const MIN_SIDE = 96;

/**
 * Si una imagen merece ampliarse: tiene texto alternativo (sin él es decorativa, y el botón no
 * tendría nombre), no es diminuta, no está dentro de un enlace o botón (ya tiene su acción) y no
 * se excluyó con `data-no-zoom`. El tamaño sale de los atributos `width`/`height`: al cablear la
 * página la imagen puede no haberse cargado aún.
 */
export function isZoomable(img: Element): boolean {
  if (!img.getAttribute('alt')?.trim()) return false;
  if (img.hasAttribute('data-no-zoom') || img.closest('a, button')) return false;
  for (const side of ['width', 'height']) {
    const declared = Number.parseFloat(img.getAttribute(side) ?? '');
    if (declared < MIN_SIDE) return false;
  }
  return true;
}

/**
 * Hace ampliables las imágenes del contenido (`.prose img`). Cada una se envuelve en un
 * `<button class="docs-zoom">`, operable con teclado, que abre un `<dialog>` modal: Escape, el
 * botón de cerrar y un clic en el fondo o en la imagen lo cierran y el foco vuelve al botón.
 * La miniatura se transforma en la imagen grande (y vuelve) con una View Transition; sin la API
 * o con movimiento reducido el diálogo se abre y se cierra sin animación. Sin JavaScript las
 * imágenes quedan como estaban.
 */
export function initZoom(
  doc: Document,
  { labels, motion = { matches: false } }: ZoomOptions,
): void {
  const images = [...doc.querySelectorAll<HTMLImageElement>('.prose img')].filter(
    (img) => !img.closest('.docs-zoom') && isZoomable(img),
  );
  if (!images.length) return;

  const dialog = doc.createElement('dialog');
  dialog.className = 'docs-zoom-dialog';
  const big = doc.createElement('img');
  big.className = 'docs-zoom-img';
  const closeButton = doc.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'docs-zoom-close';
  closeButton.setAttribute('aria-label', labels.close);
  closeButton.textContent = '×';
  dialog.append(big, closeButton);
  doc.body.append(dialog);

  let current: { trigger: HTMLElement; thumb: HTMLImageElement } | undefined;
  let closing = false;

  const name = (el: Element, on: boolean) => {
    const style = (el as HTMLElement).style;
    if (on) style.setProperty('view-transition-name', NAME);
    else style.removeProperty('view-transition-name');
  };

  const open = (trigger: HTMLElement, thumb: HTMLImageElement) => {
    if (current) return;
    current = { trigger, thumb };
    big.setAttribute('src', thumb.currentSrc || thumb.getAttribute('src') || '');
    big.setAttribute('alt', thumb.alt);
    dialog.setAttribute('aria-label', thumb.alt);
    /* El nombre va en la miniatura ANTES de la transición (la foto «antes») y pasa a la imagen
       grande dentro de ella (la foto «después»): dos elementos no pueden llevarlo a la vez. */
    name(thumb, true);
    void withTransition(
      async () => {
        name(thumb, false);
        name(big, true);
        dialog.showModal();
        /* La foto «después» se toma al resolver esta promesa: sin decodificar saldría vacía. */
        await Promise.resolve(big.decode?.()).catch(() => {});
      },
      { doc, motion, kind: 'zoom' },
    ).then(() => name(big, false));
  };

  const close = () => {
    if (!current || closing || !dialog.hasAttribute('open')) return;
    closing = true;
    const { thumb } = current;
    name(big, true);
    void withTransition(
      () => {
        name(big, false);
        name(thumb, true);
        dialog.close();
      },
      { doc, motion, kind: 'zoom' },
    ).then(() => name(thumb, false));
  };

  /* Pasa siempre que el diálogo se cierra, también si lo cierra el navegador por su cuenta. */
  dialog.addEventListener('close', () => {
    if (!current) return;
    const { trigger, thumb } = current;
    current = undefined;
    closing = false;
    name(thumb, false);
    name(big, false);
    trigger.focus();
  });
  /* Escape: se cancela el cierre nativo, que sería un corte seco, y se cierra con la animación. */
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  /* Fondo, imagen y botón de cerrar: en todos los casos, cerrar. */
  dialog.addEventListener('click', close);

  for (const thumb of images) {
    const trigger = doc.createElement('button');
    trigger.type = 'button';
    trigger.className = 'docs-zoom';
    trigger.setAttribute('aria-label', fill(labels.open, { alt: thumb.alt }));
    thumb.replaceWith(trigger);
    trigger.append(thumb);
    trigger.addEventListener('click', () => open(trigger, thumb));
  }
}
