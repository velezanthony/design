import { fill } from '../text';

/**
 * El desplegable «Tipo de problema» tiene una casilla «Todos» (`data-kinds-all`) por encima de las
 * de cada tipo (`data-kind`), todas dentro de un `[data-kinds]`. Sin JavaScript son campos de un GET
 * y el servidor lee «todos marcados» como «sin filtro». Con él, «Todos» marca o desmarca a la vez
 * todos los tipos que se pueden elegir (los deshabilitados, sin incidencias, quedan fuera), se pone
 * indeterminada si solo hay unos pocos y el resumen del título (`data-kinds-count`) cuenta cuántos.
 * Los textos del resumen viajan en `data-label-all` y `data-label-some` (con `{on}` y `{total}`).
 */
function enabledKinds(group: Element) {
  return [...group.querySelectorAll<HTMLInputElement>('[data-kind]')].filter(
    (input) => !input.disabled,
  );
}

function sync(group: Element): void {
  const all = group.querySelector<HTMLInputElement>('[data-kinds-all]');
  const kinds = enabledKinds(group);
  const on = kinds.filter((input) => input.checked).length;
  if (all) {
    all.checked = kinds.length > 0 && on === kinds.length;
    all.indeterminate = on > 0 && on < kinds.length;
  }
  const count = group.closest('details')?.querySelector<HTMLElement>('[data-kinds-count]');
  if (count) {
    const { labelAll = '', labelSome = '' } = count.dataset;
    count.textContent =
      on === kinds.length
        ? labelAll
        : fill(labelSome, { on: String(on), total: String(kinds.length) });
  }
}

export function initKindsAll(htmlDocument: Document): void {
  for (const group of htmlDocument.querySelectorAll('[data-kinds]')) sync(group);
  htmlDocument.addEventListener('change', (event) => {
    const field = event.target as HTMLElement | null;
    const group = field?.closest?.('[data-kinds]');
    if (!field || !group) return;
    if (field.matches('[data-kinds-all]')) {
      const checked = (field as HTMLInputElement).checked;
      for (const input of enabledKinds(group)) input.checked = checked;
      sync(group);
    } else if (field.matches('[data-kind]')) sync(group);
  });
}
