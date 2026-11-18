import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import RadioGroup from './RadioGroup.astro';

const options = [
  { value: 'free', label: 'Gratis' },
  { value: 'pro', label: 'Pro' },
];

function props(extra: Record<string, unknown> = {}) {
  return { name: 'plan', legend: 'Plan', options, ...extra };
}

describe('RadioGroup', () => {
  it('es un fieldset con su legend y un radio por opción, todos con el mismo name', async () => {
    const htmlDocument = await render(RadioGroup, props());
    expect(text(htmlDocument.querySelector('fieldset > legend'))).toBe('Plan');
    const radios = [...htmlDocument.querySelectorAll('input[type="radio"]')];
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['free', 'pro']);
    expect(radios.every((radio) => radio.getAttribute('name') === 'plan')).toBe(true);
  });

  it('marca la opción de value', async () => {
    const radios = [
      ...(await render(RadioGroup, props({ value: 'pro' }))).querySelectorAll('input'),
    ];
    expect(radios.map((radio) => radio.hasAttribute('checked'))).toEqual([false, true]);
  });

  it('enlaza ayuda y error con aria-describedby del fieldset', async () => {
    const htmlDocument = await render(RadioGroup, props({ help: 'Ayuda', error: 'Mal.' }));
    const fieldset = htmlDocument.querySelector('fieldset')!;
    expect(fieldset.getAttribute('aria-describedby')).toBe('group-plan-help group-plan-error');
    expect(text(htmlDocument.querySelector('#group-plan-help'))).toBe('Ayuda');
    expect(text(htmlDocument.querySelector('#group-plan-error'))).toBe('Mal.');
    expect(fieldset.getAttribute('aria-invalid')).toBe('true');
  });

  it('sin ayuda ni error no hay aria-describedby ni aria-invalid', async () => {
    const htmlDocument = await render(RadioGroup, props());
    expect(htmlDocument.querySelector('fieldset')!.hasAttribute('aria-describedby')).toBe(false);
    expect(htmlDocument.querySelector('fieldset')!.hasAttribute('aria-invalid')).toBe(false);
  });

  it('required llega a los radios y disabled a todos', async () => {
    const radios = [
      ...(await render(RadioGroup, props({ required: true, disabled: true }))).querySelectorAll(
        'input',
      ),
    ];
    expect(radios.every((radio) => radio.hasAttribute('required'))).toBe(true);
    expect(radios.every((radio) => radio.hasAttribute('disabled'))).toBe(true);
  });

  it('una opción puede estar deshabilitada por sí sola', async () => {
    const radios = [
      ...(
        await render(
          RadioGroup,
          props({
            options: [
              { value: 'free', label: 'Gratis' },
              { value: 'pro', label: 'Pro', disabled: true },
            ],
          }),
        )
      ).querySelectorAll('input'),
    ];
    expect(radios.map((radio) => radio.hasAttribute('disabled'))).toEqual([false, true]);
  });
});
