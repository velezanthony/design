import { describe, expect, it } from 'vitest';
import { clip } from './clip';

describe('clip', () => {
  it('lo que cabe se queda tal cual', () => {
    expect(clip('Guide', 60)).toBe('Guide');
  });

  it('con la longitud exacta del límite no recorta', () => {
    expect(clip('x'.repeat(60), 60)).toBe('x'.repeat(60));
  });

  it('con un carácter de más recorta y acaba en «…» sin pasar del límite', () => {
    const clipped = clip('x'.repeat(61), 60);
    expect(clipped).toBe(`${'x'.repeat(59)}…`);
    expect(clipped).toHaveLength(60);
  });

  it('un texto largo se queda en el límite', () => {
    expect(clip('x'.repeat(200), 10)).toBe(`${'x'.repeat(9)}…`);
  });

  it('el espacio que queda pegado al corte no se deja antes de «…»', () => {
    expect(clip('hello world again', 7)).toBe('hello…');
  });

  it('una cadena vacía se queda vacía', () => {
    expect(clip('', 60)).toBe('');
  });
});
