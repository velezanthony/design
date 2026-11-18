import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import Input from './Input.astro';

function props(extra: Record<string, unknown> = {}) {
  return {
    id: 'q',
    name: 'q',
    label: 'Buscar',
    ...extra,
  };
}

describe('Input', () => {
  it('asocia la etiqueta con el campo por for/id', async () => {
    const doc = await render(Input, props());
    const input = doc.querySelector('input')!;
    const label = doc.querySelector('label')!;
    expect(input.getAttribute('id')).toBe('q');
    expect(label.getAttribute('for')).toBe('q');
    expect(text(label)).toBe('Buscar');
  });

  it('por defecto es de texto; también puede ser de búsqueda', async () => {
    expect((await render(Input, props())).querySelector('input')!.getAttribute('type')).toBe(
      'text',
    );
    const search = await render(Input, props({ type: 'search' }));
    expect(search.querySelector('input')!.getAttribute('type')).toBe('search');
  });

  it('refleja name, value y placeholder', async () => {
    const input = (
      await render(Input, props({ value: 'guide', placeholder: 'slug o título' }))
    ).querySelector('input')!;
    expect(input.getAttribute('name')).toBe('q');
    expect(input.getAttribute('value')).toBe('guide');
    expect(input.getAttribute('placeholder')).toBe('slug o título');
  });

  /* Ocultar la etiqueta a la vista no la quita del árbol de accesibilidad. */
  it('con hideLabel la etiqueta sigue ahí, solo para lectores de pantalla', async () => {
    const label = (await render(Input, props({ hideLabel: true }))).querySelector('label')!;
    expect(label.classList.contains('sr-only')).toBe(true);
    expect(text(label)).toBe('Buscar');
  });

  it('con la etiqueta visible no lleva sr-only', async () => {
    const label = (await render(Input, props())).querySelector('label')!;
    expect(label.classList.contains('sr-only')).toBe(false);
  });

  it('propaga atributos al campo y la clase al contenedor', async () => {
    const doc = await render(Input, props({ required: true, autocomplete: 'off', class: 'w-64' }));
    const input = doc.querySelector('input')!;
    expect(input.hasAttribute('required')).toBe(true);
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.classList.contains('w-64')).toBe(false);
    expect(doc.querySelector('label')!.parentElement!.classList.contains('w-64')).toBe(true);
  });
});
