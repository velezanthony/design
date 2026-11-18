import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import FormField from './FormField.astro';

function props(extra: Record<string, unknown> = {}) {
  return { name: 'email', label: 'Correo', ...extra };
}

describe('FormField', () => {
  it('une etiqueta y campo por for/id, con un id derivado del name', async () => {
    const htmlDocument = await render(FormField, props());
    const input = htmlDocument.querySelector('input')!;
    const label = htmlDocument.querySelector('label')!;
    expect(input.getAttribute('id')).toBe('field-email');
    expect(input.getAttribute('name')).toBe('email');
    expect(label.getAttribute('for')).toBe('field-email');
    expect(text(label)).toBe('Correo');
    expect(htmlDocument.querySelectorAll('label')).toHaveLength(1);
  });

  it('un id explícito manda sobre el derivado', async () => {
    const htmlDocument = await render(FormField, props({ id: 'mail' }));
    expect(htmlDocument.querySelector('input')!.getAttribute('id')).toBe('mail');
    expect(htmlDocument.querySelector('label')!.getAttribute('for')).toBe('mail');
  });

  it('sin ayuda ni error el campo no declara aria-describedby ni aria-invalid', async () => {
    const input = (await render(FormField, props())).querySelector('input')!;
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('enlaza la ayuda con aria-describedby', async () => {
    const htmlDocument = await render(FormField, props({ help: 'Nunca lo compartimos.' }));
    const input = htmlDocument.querySelector('input')!;
    expect(input.getAttribute('aria-describedby')).toBe('field-email-help');
    expect(text(htmlDocument.querySelector('#field-email-help'))).toBe('Nunca lo compartimos.');
  });

  it('con error marca aria-invalid y lo enlaza después de la ayuda', async () => {
    const htmlDocument = await render(
      FormField,
      props({ help: 'Ayuda', error: 'Falta el correo.' }),
    );
    const input = htmlDocument.querySelector('input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('field-email-help field-email-error');
    expect(text(htmlDocument.querySelector('#field-email-error'))).toBe('Falta el correo.');
  });

  it('solo el error: describedby apunta solo a él', async () => {
    const input = (await render(FormField, props({ error: 'Mal.' }))).querySelector('input')!;
    expect(input.getAttribute('aria-describedby')).toBe('field-email-error');
  });

  it('required es nativo y la etiqueta lo marca', async () => {
    const htmlDocument = await render(FormField, props({ required: true }));
    expect(htmlDocument.querySelector('input')!.hasAttribute('required')).toBe(true);
    expect(htmlDocument.querySelector('label [aria-hidden="true"]')).not.toBeNull();
  });

  it('disabled llega al campo', async () => {
    const input = (await render(FormField, props({ disabled: true }))).querySelector('input')!;
    expect(input.hasAttribute('disabled')).toBe(true);
  });

  it('un aria-describedby propio se conserva y se le suman los ids', async () => {
    const input = (
      await render(FormField, props({ help: 'Ayuda', 'aria-describedby': 'otro' }))
    ).querySelector('input')!;
    expect(input.getAttribute('aria-describedby')).toBe('otro field-email-help');
  });

  it('control textarea pinta un textarea con el mismo cableado', async () => {
    const htmlDocument = await render(
      FormField,
      props({ control: 'textarea', name: 'bio', label: 'Biografía', error: 'Mal.' }),
    );
    const field = htmlDocument.querySelector('textarea')!;
    expect(field.getAttribute('id')).toBe('field-bio');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe('field-bio-error');
  });

  it('control select pinta un select con sus opciones y el mismo cableado', async () => {
    const htmlDocument = await render(
      FormField,
      props({
        control: 'select',
        name: 'plan',
        label: 'Plan',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        value: 'b',
        help: 'Elige uno.',
      }),
    );
    const select = htmlDocument.querySelector('select')!;
    expect(select.getAttribute('id')).toBe('field-plan');
    expect(select.getAttribute('aria-describedby')).toBe('field-plan-help');
    expect(htmlDocument.querySelectorAll('option')).toHaveLength(2);
    expect(htmlDocument.querySelectorAll('label')).toHaveLength(1);
  });
});
