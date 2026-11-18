import { describe, expect, it } from 'vitest';

import { render } from '../../../testing/render';
import Textarea from './Textarea.astro';

async function textarea(props: Record<string, unknown> = {}) {
  return (await render(Textarea, { id: 'bio', name: 'bio', ...props })).querySelector('textarea')!;
}

describe('Textarea', () => {
  it('es un textarea con su id y su name', async () => {
    const field = await textarea();
    expect(field.getAttribute('id')).toBe('bio');
    expect(field.getAttribute('name')).toBe('bio');
  });

  it('invalid pone aria-invalid; sin él no lo lleva', async () => {
    expect((await textarea({ invalid: true })).getAttribute('aria-invalid')).toBe('true');
    expect((await textarea()).hasAttribute('aria-invalid')).toBe(false);
  });

  it('required y disabled son los nativos', async () => {
    const field = await textarea({ required: true, disabled: true });
    expect(field.hasAttribute('required')).toBe(true);
    expect(field.hasAttribute('disabled')).toBe(true);
  });

  it('pinta el valor como contenido y propaga aria-describedby', async () => {
    const field = await textarea({ value: 'Hola', 'aria-describedby': 'bio-help' });
    expect(field.textContent).toBe('Hola');
    expect(field.getAttribute('aria-describedby')).toBe('bio-help');
  });
});
