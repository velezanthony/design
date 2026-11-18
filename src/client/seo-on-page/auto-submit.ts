/** Los campos `data-auto-submit` envían su formulario al cambiar (delegación en el documento); sin JS conserva su botón en `<noscript>`. */
export function initAutoSubmit(htmlDocument: Document): void {
  htmlDocument.addEventListener('change', (event) => {
    const field = event.target as HTMLElement | null;
    if (!field?.closest || !field.closest('[data-auto-submit]')) return;
    const form = field.closest('form');
    if (!form) return;
    // `requestSubmit` pasa por la validación y el evento `submit`, como un clic en el botón.
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.submit();
  });
}
