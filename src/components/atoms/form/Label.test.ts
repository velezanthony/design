import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import Label from './Label.astro';

describe('Label', () => {
  it('es un label asociado por for', async () => {
    const label = (await render(Label, { for: 'email' }, { default: 'Correo' })).querySelector(
      'label',
    )!;
    expect(label.getAttribute('for')).toBe('email');
    expect(text(label)).toBe('Correo');
  });

  it('required añade un asterisco oculto a lectores de pantalla', async () => {
    const label = (
      await render(Label, { for: 'email', required: true }, { default: 'Correo' })
    ).querySelector('label')!;
    const mark = label.querySelector('[aria-hidden="true"]')!;
    expect(mark.textContent).toBe('*');
  });

  it('sin required no hay asterisco', async () => {
    const label = (await render(Label, { for: 'email' }, { default: 'Correo' })).querySelector(
      'label',
    )!;
    expect(label.querySelector('[aria-hidden]')).toBeNull();
  });
});
