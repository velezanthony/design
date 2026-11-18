import { fill } from '../text';

/** La casilla «Todos» (`data-kinds-all`) marca o desmarca los tipos elegibles de `[data-kinds]`, se pone indeterminada si hay solo algunos y actualiza el resumen (`data-label-all`/`data-label-some`). */
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
