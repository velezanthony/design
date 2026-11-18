import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import Button from './Button.astro';

const button = async (props: Record<string, unknown> = {}) =>
  (await render(Button, props, { default: 'Filtrar' })).querySelector('button')!;

describe('Button', () => {
  it('es un <button> con su texto', async () => {
    const el = await button();
    expect(el.tagName).toBe('BUTTON');
    expect(text(el)).toBe('Filtrar');
  });

  /* Sin `type`, un <button> dentro de un formulario envía el formulario: aquí es opt-in. */
  it('por defecto es type="button"', async () => {
    expect((await button()).getAttribute('type')).toBe('button');
  });

  it('permite type="submit"', async () => {
    expect((await button({ type: 'submit' })).getAttribute('type')).toBe('submit');
  });

  it('con disabled lo marca y no promete clic', async () => {
    const el = await button({ disabled: true });
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.classList.contains('cursor-not-allowed')).toBe(true);
    expect(el.classList.contains('cursor-pointer')).toBe(false);
  });

  /* Tailwind 4 pone `cursor: default` a los <button>: el puntero tiene que ser explícito. */
  it('habilitado lleva cursor-pointer', async () => {
    const el = await button();
    expect(el.classList.contains('cursor-pointer')).toBe(true);
    expect(el.classList.contains('cursor-not-allowed')).toBe(false);
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
    const el = await button({
      name: 'intent',
      value: 'save',
      'aria-label': 'Guardar',
      class: 'extra',
    });
    expect(el.getAttribute('name')).toBe('intent');
    expect(el.getAttribute('value')).toBe('save');
    expect(el.getAttribute('aria-label')).toBe('Guardar');
    expect(el.classList.contains('extra')).toBe(true);
  });
});
