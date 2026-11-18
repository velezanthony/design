import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import Button from './Button.astro';

async function button(props: Record<string, unknown> = {}) {
  return (await render(Button, props, { default: 'Filtrar' })).querySelector('button')!;
}

describe('Button', () => {
  it('es un <button> con su texto', async () => {
    const element = await button();
    expect(element.tagName).toBe('BUTTON');
    expect(text(element)).toBe('Filtrar');
  });

  /* Sin `type`, un <button> dentro de un formulario envía el formulario: aquí es opt-in. */
  it('por defecto es type="button"', async () => {
    expect((await button()).getAttribute('type')).toBe('button');
  });

  it('permite type="submit"', async () => {
    expect((await button({ type: 'submit' })).getAttribute('type')).toBe('submit');
  });

  it('con disabled lo marca y no promete clic', async () => {
    const element = await button({ disabled: true });
    expect(element.hasAttribute('disabled')).toBe(true);
    expect(element.classList.contains('cursor-not-allowed')).toBe(true);
    expect(element.classList.contains('cursor-pointer')).toBe(false);
  });

  /* Tailwind 4 pone `cursor: default` a los <button>: el puntero tiene que ser explícito. */
  it('habilitado lleva cursor-pointer', async () => {
    const element = await button();
    expect(element.classList.contains('cursor-pointer')).toBe(true);
    expect(element.classList.contains('cursor-not-allowed')).toBe(false);
  });

  it.each(['primary', 'secondary', 'quiet'])(
    'la variante %s tiene un objetivo de al menos 24px',
    async (variant) => {
      expect((await button({ variant })).classList.contains('min-h-8')).toBe(true);
    },
  );

  it('cada variante pinta distinto', async () => {
    const classes = await Promise.all(
      ['primary', 'secondary', 'quiet'].map(
        async (variant) => (await button({ variant })).className,
      ),
    );
    expect(new Set(classes).size).toBe(3);
  });

  it('propaga name, value, aria-* y class', async () => {
    const element = await button({
      name: 'intent',
      value: 'save',
      'aria-label': 'Guardar',
      class: 'extra',
    });
    expect(element.getAttribute('name')).toBe('intent');
    expect(element.getAttribute('value')).toBe('save');
    expect(element.getAttribute('aria-label')).toBe('Guardar');
    expect(element.classList.contains('extra')).toBe(true);
  });
});
