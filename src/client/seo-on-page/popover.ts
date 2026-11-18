/** `<details data-popover>` se cierra al pulsar fuera o con Escape (el foco vuelve al `<summary>`). */
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
