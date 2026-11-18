/**
 * Un `<details data-popover>` se comporta como un desplegable: se cierra al pulsar fuera de él o con
 * Escape (y entonces el foco vuelve a su `<summary>`, para no perderlo). Sin JavaScript sigue siendo
 * un `<details>` que se abre y se cierra con su título.
 */
function openPopovers(htmlDocument: Document) {
  return [...htmlDocument.querySelectorAll<HTMLDetailsElement>('details[data-popover][open]')];
}

export function initPopovers(htmlDocument: Document): void {
  htmlDocument.addEventListener('pointerdown', (event) => {
    const target = event.target as Node | null;
    for (const popover of openPopovers(htmlDocument)) {
      if (!target || !popover.contains(target)) popover.removeAttribute('open');
    }
  });
  htmlDocument.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key !== 'Escape') return;
    for (const popover of openPopovers(htmlDocument)) {
      popover.removeAttribute('open');
      popover.querySelector<HTMLElement>('summary')?.focus();
    }
  });
}
