import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import Select from './Select.astro';

const options = [
  { value: '10', label: 'Diez' },
  { value: '25', label: 'Veinticinco' },
  { value: '50', label: 'Cincuenta' },
];

function props(extra: Record<string, unknown> = {}) {
  return {
    id: 'per',
    name: 'per',
    label: 'Filas por página',
    options,
    ...extra,
  };
}

describe('Select', () => {
  it('asocia la etiqueta con el campo por for/id', async () => {
    const htmlDocument = await render(Select, props());
    const select = htmlDocument.querySelector('select')!;
    const label = htmlDocument.querySelector('label')!;
    expect(select.getAttribute('id')).toBe('per');
    expect(select.getAttribute('name')).toBe('per');
    expect(label.getAttribute('for')).toBe('per');
    expect(text(label)).toBe('Filas por página');
  });

  it('pinta las opciones en el orden dado, con su valor y su texto', async () => {
    const htmlDocument = await render(Select, props());
    const rendered = [...htmlDocument.querySelectorAll('option')].map((option) => [
      option.getAttribute('value'),
      text(option),
    ]);
    expect(rendered).toEqual([
      ['10', 'Diez'],
      ['25', 'Veinticinco'],
      ['50', 'Cincuenta'],
    ]);
  });

  it('marca como seleccionada solo la opción que coincide con value', async () => {
    const htmlDocument = await render(Select, props({ value: '25' }));
    const selected = [...htmlDocument.querySelectorAll('option[selected]')].map((option) =>
      option.getAttribute('value'),
    );
    expect(selected).toEqual(['25']);
  });

  it('sin value no marca ninguna: el navegador elige la primera', async () => {
    const htmlDocument = await render(Select, props());
    expect(htmlDocument.querySelectorAll('option[selected]').length).toBe(0);
  });

  it('en línea, la etiqueta va delante del campo en la misma fila y el campo no se estira', async () => {
    const htmlDocument = await render(Select, props({ inline: true }));
    const wrapper = htmlDocument.querySelector('[data-select]')!;
    expect(wrapper.getAttribute('data-layout')).toBe('inline');
    expect(wrapper.firstElementChild?.tagName).toBe('LABEL');
    expect(htmlDocument.querySelector('select')!.className).not.toContain('w-full');
  });

  it('por defecto, la etiqueta va encima y el campo ocupa su contenedor', async () => {
    const htmlDocument = await render(Select, props());
    expect(htmlDocument.querySelector('[data-select]')!.getAttribute('data-layout')).toBe(
      'stacked',
    );
    expect(htmlDocument.querySelector('select')!.className).toContain('w-full');
  });

  it('con hideLabel la etiqueta sigue ahí, solo para lectores de pantalla', async () => {
    const label = (await render(Select, props({ hideLabel: true }))).querySelector('label')!;
    expect(label.classList.contains('sr-only')).toBe(true);
    expect(text(label)).toBe('Filas por página');
  });

  it('con la etiqueta visible no lleva sr-only', async () => {
    const label = (await render(Select, props())).querySelector('label')!;
    expect(label.classList.contains('sr-only')).toBe(false);
  });

  it('habilitado lleva cursor-pointer', async () => {
    const select = (await render(Select, props())).querySelector('select')!;
    expect(select.classList.contains('cursor-pointer')).toBe(true);
    expect(select.classList.contains('cursor-not-allowed')).toBe(false);
  });

  it('deshabilitado lleva disabled y cursor-not-allowed, no cursor-pointer', async () => {
    const select = (await render(Select, props({ disabled: true }))).querySelector('select')!;
    expect(select.hasAttribute('disabled')).toBe(true);
    expect(select.classList.contains('cursor-not-allowed')).toBe(true);
    expect(select.classList.contains('cursor-pointer')).toBe(false);
  });

  it('propaga atributos al campo y la clase al contenedor', async () => {
    const htmlDocument = await render(Select, props({ required: true, class: 'w-40' }));
    const select = htmlDocument.querySelector('select')!;
    expect(select.hasAttribute('required')).toBe(true);
    expect(select.classList.contains('w-40')).toBe(false);
    expect(htmlDocument.querySelector('label')!.parentElement!.classList.contains('w-40')).toBe(
      true,
    );
  });
});
