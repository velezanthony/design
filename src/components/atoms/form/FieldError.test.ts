import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import FieldError from './FieldError.astro';

describe('FieldError', () => {
  it('lleva el id que le da quien lo enlaza y su texto', async () => {
    const error = (
      await render(FieldError, { id: 'email-error' }, { default: 'Falta el correo.' })
    ).querySelector('#email-error')!;
    expect(text(error)).toBe('Falta el correo.');
  });
});
