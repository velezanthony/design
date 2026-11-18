/**
 * Un `<details data-popover>` se comporta como un desplegable: se cierra al pulsar fuera de él o con
 * Escape (y entonces el foco vuelve a su `<summary>`, para no perderlo). Sin JavaScript sigue siendo
 * un `<details>` que se abre y se cierra con su título.
 */
function openPopovers(doc: Document) {
  return [...doc.querySelectorAll<HTMLDetailsElement>('details[data-popover][open]')];
}

export function initPopovers(doc: Document): void {
  doc.addEventListener('pointerdown', (event) => {
    const target = event.target as Node | null;
    for (const popover of openPopovers(doc)) {
      if (!target || !popover.contains(target)) popover.removeAttribute('open');
    }
  });
  doc.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key !== 'Escape') return;
    for (const popover of openPopovers(doc)) {
      popover.removeAttribute('open');
      popover.querySelector<HTMLElement>('summary')?.focus();
    }
  });
}
