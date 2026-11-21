import { describe, expect, it } from 'vitest';
import { coverFor, coverPattern } from './covers';

describe('coverFor', () => {
  it('una imagen real se muestra con su alt, decorativa (vacío) si no lo trae', () => {
    expect(coverFor({ src: '/a.png' }, false, 'Un gato')).toEqual({
      kind: 'image',
      source: { src: '/a.png' },
      alt: 'Un gato',
    });
    expect(coverFor({ src: '/a.png' }, true)).toMatchObject({ kind: 'image', alt: '' });
  });

  it('`false` en la página: sin imagen aunque la carpeta pida portadas', () => {
    expect(coverFor(false, true)).toEqual({ kind: 'none' });
  });

  it('una imagen que falta: la de la librería aunque la política diga que no', () => {
    expect(coverFor('missing', false)).toEqual({ kind: 'placeholder' });
  });

  it('sin nada en la página manda la política de la carpeta', () => {
    expect(coverFor(undefined, true)).toEqual({ kind: 'placeholder' });
    expect(coverFor(undefined, false)).toEqual({ kind: 'none' });
  });
});

describe('coverPattern', () => {
  it('estable por slug y entre los tres dibujos', () => {
    expect(coverPattern('tutoriales/instalacion')).toBe(coverPattern('tutoriales/instalacion'));
    const patterns = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(coverPattern));
    expect([...patterns].every((pattern) => ['grid', 'diagonal', 'dots'].includes(pattern))).toBe(
      true,
    );
    expect(patterns.size).toBeGreaterThan(1);
  });
});
