import { describe, expect, it } from 'vitest';
import { fill } from './text';

describe('fill', () => {
  it('sustituye varias variables', () => {
    expect(fill('{on} de {total}', { on: '3', total: '12' })).toBe('3 de 12');
  });

  it('deja tal cual la variable que falta', () => {
    expect(fill('{on} de {total}', { on: '3' })).toBe('3 de {total}');
  });

  it('el valor va literal: `$&` no se interpreta', () => {
    expect(fill('«{query}»', { query: 'a$&b' })).toBe('«a$&b»');
  });
});
