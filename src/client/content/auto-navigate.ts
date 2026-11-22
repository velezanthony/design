/** Los `select[data-auto-navigate]` llevan a la URL de la opción elegida al cambiar (delegación en el documento). Es el selector «Por página» de los listados: sin JavaScript, sus enlaces de `<noscript>`. */
export function initAutoNavigate(htmlDocument: Document, location: Pick<Location, 'assign'>): void {
  htmlDocument.addEventListener('change', (event) => {
    const field = event.target as HTMLSelectElement | null;
    if (!field?.matches?.('select[data-auto-navigate]') || !field.value) return;
    location.assign(field.value);
  });
}
