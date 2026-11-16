import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import Heading from './Heading.astro';

describe('Heading', () => {
  it('es un h2 por defecto', async () => {
    expect((await render(Heading)).querySelector('h2')).not.toBeNull();
  });

  it.each([1, 2, 3, 4])('renderiza el nivel %i', async (level) => {
    expect((await render(Heading, { level })).querySelector(`h${level}`)).not.toBeNull();
  });

  it('lleva el id y la clase del tamaño', async () => {
    const h = (
      await render(Heading, { level: 3, size: 'md', id: 'x', class: 'extra' })
    ).querySelector('h3')!;
    expect(h.id).toBe('x');
    expect(h.classList.contains('text-lg')).toBe(true);
    expect(h.classList.contains('extra')).toBe(true);
  });

  it('con tamaño none no añade clases de tamaño', async () => {
    const h = (await render(Heading, { size: 'none' })).querySelector('h2')!;
    expect([...h.classList]).toEqual(['text-ink']);
    expect(text(h)).toBe('');
  });
});
