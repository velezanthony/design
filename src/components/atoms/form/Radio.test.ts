import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import Radio from './Radio.astro';

async function radio(props: Record<string, unknown> = {}) {
  return render(Radio, { name: 'plan', value: 'free', ...props }, { default: 'Gratis' });
}

describe('Radio', () => {
  it('es un input radio dentro de su etiqueta, así que pulsar el texto lo marca', async () => {
    const htmlDocument = await radio();
    const input = htmlDocument.querySelector('label input')!;
    expect(input.getAttribute('type')).toBe('radio');
    expect(input.getAttribute('name')).toBe('plan');
    expect(input.getAttribute('value')).toBe('free');
    expect(text(htmlDocument.querySelector('label'))).toBe('Gratis');
  });

  it('checked, required y disabled son los nativos', async () => {
    const input = (await radio({ checked: true, required: true, disabled: true })).querySelector(
      'input',
    )!;
    expect(input.hasAttribute('checked')).toBe(true);
    expect(input.hasAttribute('required')).toBe(true);
    expect(input.hasAttribute('disabled')).toBe(true);
  });

  it('puntero en lo clicable; deshabilitado, not-allowed', async () => {
    const enabled = await radio();
    expect(enabled.querySelector('label')!.classList.contains('cursor-pointer')).toBe(true);
    const disabled = await radio({ disabled: true });
    expect(disabled.querySelector('label')!.classList.contains('cursor-not-allowed')).toBe(true);
    expect(disabled.querySelector('label')!.classList.contains('cursor-pointer')).toBe(false);
  });
});
