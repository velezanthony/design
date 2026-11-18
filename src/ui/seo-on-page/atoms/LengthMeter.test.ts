import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import LengthMeter from './LengthMeter.astro';

const meter = (value: number) => render(LengthMeter, { value, max: 60, min: 15 });
const root = (doc: Document) => doc.querySelector('[data-meter]')!;

describe('LengthMeter', () => {
  it('dentro del rango no marca nada y dice «21 de 60 caracteres»', async () => {
    const doc = await meter(21);
    expect(root(doc).getAttribute('data-meter')).toBe('ok');
    expect(root(doc).getAttribute('aria-label')).toBe('21 de 60 caracteres');
    expect(text(root(doc))).toBe('21/60');
  });

  it('por debajo del mínimo dice «corto» con palabras, no solo con color', async () => {
    const doc = await meter(8);
    expect(root(doc).getAttribute('data-meter')).toBe('short');
    expect(text(root(doc))).toContain('corto');
    expect(root(doc).getAttribute('aria-label')).toContain('mínimo 15');
  });

  it('por encima del máximo dice «largo»', async () => {
    const doc = await meter(72);
    expect(root(doc).getAttribute('data-meter')).toBe('long');
    expect(text(root(doc))).toContain('largo');
  });

  it('justo en los límites sigue siendo válido', async () => {
    expect(root(await meter(15)).getAttribute('data-meter')).toBe('ok');
    expect(root(await meter(60)).getAttribute('data-meter')).toBe('ok');
  });

  it('la barra no pasa del 100 % y la marca del mínimo cae en su proporción', async () => {
    const doc = await meter(120);
    const spans = [...root(doc).querySelectorAll('span[style]')];
    expect(spans[0]!.getAttribute('style')).toContain('width:100%');
    expect(spans[1]!.getAttribute('style')).toContain('left:25%');
  });
});
