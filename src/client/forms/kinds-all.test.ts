import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { initKindsAll } from './kinds-all';

const group = (checked: boolean[], disabled = 0) => `
  <details>
    <summary>Tipo <span data-kinds-count data-label-all="· todos" data-label-some="· {on} de {total}">· todos</span></summary>
    <div data-kinds>
      <input type="checkbox" data-kinds-all>
      ${checked.map((on, index) => `<input type="checkbox" data-kind value="k${index}" ${on ? 'checked' : ''}>`).join('')}
      ${Array.from({ length: disabled }, () => '<input type="checkbox" data-kind disabled>').join('')}
    </div>
  </details>`;

function setup(checked: boolean[], disabled = 0) {
  const { document } = parseHTML(
    `<!doctype html><html><body>${group(checked, disabled)}</body></html>`,
  );
  // linkedom no refleja el atributo `checked` en la propiedad, como sí hace un navegador.
  for (const input of document.querySelectorAll<HTMLInputElement>('input[checked]')) {
    input.checked = true;
  }
  initKindsAll(document);
  const all = document.querySelector<HTMLInputElement>('[data-kinds-all]')!;
  const kinds = [...document.querySelectorAll<HTMLInputElement>('[data-kind]:not(:disabled)')];
  const count = document.querySelector('[data-kinds-count]')!;
  const change = (input: HTMLInputElement, value: boolean) => {
    input.checked = value;
    input.dispatchEvent(new document.defaultView!.Event('change', { bubbles: true }));
  };
  return { all, kinds, count, change, document };
}

describe('initKindsAll', () => {
  it('al cargar, con todos los tipos marcados «Todos» está marcado', () => {
    const { all, count } = setup([true, true, true]);
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    expect(count.textContent).toBe('· todos');
  });

  it('al cargar, con unos pocos «Todos» queda indeterminado y el resumen dice «2 de 3»', () => {
    const { all, count } = setup([true, true, false]);
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);
    expect(count.textContent).toBe('· 2 de 3');
  });

  it('marcar «Todos» marca todos los tipos', () => {
    const { all, kinds, change } = setup([true, false, false]);
    change(all, true);
    expect(kinds.map((kind) => kind.checked)).toEqual([true, true, true]);
    expect(all.indeterminate).toBe(false);
  });

  it('desmarcar «Todos» los desmarca todos', () => {
    const { all, kinds, change, count } = setup([true, true, true]);
    change(all, false);
    expect(kinds.map((kind) => kind.checked)).toEqual([false, false, false]);
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(false);
    expect(count.textContent).toBe('· 0 de 3');
  });

  it('desmarcar un tipo deja «Todos» indeterminado', () => {
    const { all, kinds, change, count } = setup([true, true, true]);
    change(kinds[1]!, false);
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);
    expect(count.textContent).toBe('· 2 de 3');
  });

  it('marcar el último tipo que faltaba marca «Todos»', () => {
    const { all, kinds, change, count } = setup([true, true, false]);
    change(kinds[2]!, true);
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    expect(count.textContent).toBe('· todos');
  });

  it('los tipos deshabilitados (sin incidencias) ni se tocan ni cuentan', () => {
    const { all, change, document } = setup([true, true], 2);
    const disabled = [...document.querySelectorAll<HTMLInputElement>('[data-kind]:disabled')];
    change(all, false);
    expect(disabled.every((input) => !input.checked)).toBe(true);
    change(all, true);
    expect(disabled.every((input) => !input.checked)).toBe(true);
    expect(all.checked).toBe(true);
  });

  it('un cambio fuera del grupo no hace nada', () => {
    const { document, all } = setup([true, false]);
    const outside = document.createElement('input');
    document.body.append(outside);
    outside.dispatchEvent(new document.defaultView!.Event('change', { bubbles: true }));
    expect(all.indeterminate).toBe(true);
  });

  it('una página sin el grupo no rompe nada', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    expect(() => initKindsAll(document)).not.toThrow();
  });
});
