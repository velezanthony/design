import { describe, expect, it } from 'vitest';
import { estimateSize, sizeLabel } from './size';

describe('estimateSize', () => {
  it('cuenta las líneas del texto', () => {
    expect(estimateSize('a\nb\nc').lines).toBe(3);
    expect(estimateSize('una sola').lines).toBe(1);
  });

  it('los bytes son UTF-8: una tilde pesa dos', () => {
    expect(estimateSize('aé').bytes).toBe(3);
  });

  it('los tokens son una estimación de ≈4 caracteres por token, redondeada a 50', () => {
    expect(estimateSize('x'.repeat(4000)).tokens).toBe(1000);
    expect(estimateSize('x'.repeat(4110)).tokens).toBe(1050);
  });

  it('cuenta caracteres, no unidades UTF-16: un emoji es uno', () => {
    expect(estimateSize('😀'.repeat(400)).tokens).toBe(100);
  });

  it('un texto muy corto no estima 0 tokens', () => {
    expect(estimateSize('hola').tokens).toBe(50);
  });
});

describe('sizeLabel', () => {
  it('dice líneas, KB y tokens, y que los tokens son una estimación', () => {
    const label = sizeLabel(estimateSize(`${'x'.repeat(2047)}\nfin`));
    expect(label).toBe('2 líneas · 2,0 KB · ≈500 tokens (estimado)');
  });

  it('una línea va en singular', () => {
    expect(sizeLabel(estimateSize('hola'))).toContain('1 línea ·');
  });
});
