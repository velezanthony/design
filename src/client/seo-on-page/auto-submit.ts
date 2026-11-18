/**
 * Los campos marcados con `data-auto-submit` envían su formulario en cuanto cambian: el GET de
 * siempre, sin botón que pulsar. Se escucha en el documento (delegación), así sirve para campos que
 * aparezcan después. Sin JavaScript el formulario conserva su botón dentro de `<noscript>`.
 */
export function initAutoSubmit(doc: Document): void {
  doc.addEventListener('change', (event) => {
    const field = event.target as HTMLElement | null;
    if (!field?.closest || !field.closest('[data-auto-submit]')) return;
    const form = field.closest('form');
    if (!form) return;
    // `requestSubmit` pasa por la validación y el evento `submit`, como un clic en el botón.
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.submit();
  });
}
