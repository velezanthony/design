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

  it('aria-checked refleja el estado inicial', async () => {
    expect((await toggle()).querySelector('input')!.getAttribute('aria-checked')).toBe('false');
    const on = (await toggle({ checked: true })).querySelector('input')!;
    expect(on.getAttribute('aria-checked')).toBe('true');
    expect(on.hasAttribute('checked')).toBe(true);
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
