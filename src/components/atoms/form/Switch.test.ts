import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import Switch from './Switch.astro';

async function toggle(props: Record<string, unknown> = {}) {
  return render(Switch, { name: 'notify', ...props }, { default: 'Avisarme' });
}

describe('Switch', () => {
  it('es un checkbox con role switch dentro de su etiqueta', async () => {
    const htmlDocument = await toggle();
    const input = htmlDocument.querySelector('label input')!;
    expect(input.getAttribute('type')).toBe('checkbox');
    expect(input.getAttribute('role')).toBe('switch');
    expect(text(htmlDocument.querySelector('label'))).toBe('Avisarme');
  });

  it('el estado va en el checked nativo, sin un aria-checked que se quede viejo al pulsar', async () => {
    const off = (await toggle()).querySelector('input')!;
    expect(off.hasAttribute('checked')).toBe(false);
    expect(off.hasAttribute('aria-checked')).toBe(false);
    const on = (await toggle({ checked: true })).querySelector('input')!;
    expect(on.hasAttribute('checked')).toBe(true);
    expect(on.hasAttribute('aria-checked')).toBe(false);
  });

  it('required, disabled e invalid se reflejan', async () => {
    const input = (await toggle({ required: true, disabled: true, invalid: true })).querySelector(
      'input',
    )!;
    expect(input.hasAttribute('required')).toBe(true);
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('puntero en lo clicable; deshabilitado, not-allowed', async () => {
    expect((await toggle()).querySelector('label')!.classList.contains('cursor-pointer')).toBe(
      true,
    );
    const disabled = (await toggle({ disabled: true })).querySelector('label')!;
    expect(disabled.classList.contains('cursor-not-allowed')).toBe(true);
  });
});
