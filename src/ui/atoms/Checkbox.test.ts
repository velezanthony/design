import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import Checkbox from './Checkbox.astro';

const checkbox = async (props: Record<string, unknown> = {}, label = 'Errores') =>
  render(Checkbox, { name: 'severity', value: 'error', ...props }, { default: label });

describe('Checkbox', () => {
  it('es un input checkbox dentro de su etiqueta, así que pulsar el texto lo marca', async () => {
    const doc = await checkbox();
    const input = doc.querySelector('input')!;
    expect(input.getAttribute('type')).toBe('checkbox');
    expect(input.closest('label')).not.toBeNull();
    expect(text(input.closest('label'))).toBe('Errores');
  });

  it('refleja name y value', async () => {
    const input = (await checkbox()).querySelector('input')!;
    expect(input.getAttribute('name')).toBe('severity');
    expect(input.getAttribute('value')).toBe('error');
  });

  it('refleja el estado checked, y sin él va desmarcado', async () => {
    expect(
      (await checkbox({ checked: true })).querySelector('input')!.hasAttribute('checked'),
    ).toBe(true);
    expect(
      (await checkbox({ checked: false })).querySelector('input')!.hasAttribute('checked'),
    ).toBe(false);
    expect((await checkbox()).querySelector('input')!.hasAttribute('checked')).toBe(false);
  });

  /* Se puede pulsar tanto el cuadro como el texto: los dos llevan el puntero. */
  it('el campo y su etiqueta llevan cursor-pointer', async () => {
    const doc = await checkbox();
    expect(doc.querySelector('input')!.classList.contains('cursor-pointer')).toBe(true);
    expect(doc.querySelector('label')!.classList.contains('cursor-pointer')).toBe(true);
  });

  it('deshabilitado marca el campo y usa cursor-not-allowed en vez del puntero', async () => {
    const doc = await checkbox({ disabled: true });
    const input = doc.querySelector('input')!;
    const label = doc.querySelector('label')!;
    expect(input.hasAttribute('disabled')).toBe(true);
    for (const el of [input, label]) {
      expect(el.classList.contains('cursor-not-allowed')).toBe(true);
      expect(el.classList.contains('cursor-pointer')).toBe(false);
    }
  });

  it('un objetivo de al menos 24px', async () => {
    expect((await checkbox()).querySelector('label')!.classList.contains('min-h-6')).toBe(true);
  });

  it('propaga atributos al campo y la clase a la etiqueta', async () => {
    const doc = await checkbox({ id: 'sev-error', class: 'extra' });
    expect(doc.querySelector('input')!.getAttribute('id')).toBe('sev-error');
    expect(doc.querySelector('label')!.classList.contains('extra')).toBe(true);
  });
});
