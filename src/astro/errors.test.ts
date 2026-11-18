import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { DocsError, DocsErrors } from '../core/errors';
import { orAstroError, toAstroError } from './errors';

describe('toAstroError', () => {
  it('envuelve los DocsErrors agregados en un AstroError con todos los mensajes', () => {
    const wrapped = toAstroError(
      new DocsErrors([
        new DocsError('uno', { file: 'a.md', line: 3 }),
        new DocsError('dos', { file: 'b.md', hint: 'arréglalo' }),
      ]),
      'Config inválida',
    );
    expect(wrapped).toBeInstanceOf(AstroError);
    expect(wrapped.message).toBe('Config inválida');
    expect(wrapped.hint).toContain('a.md:3: uno');
    expect(wrapped.hint).toContain('b.md: dos (arréglalo)');
  });

  it('envuelve un DocsError suelto', () => {
    expect(toAstroError(new DocsError('x', { file: 'a.md' }), 'T').hint).toBe('a.md: x');
  });

  it('un error ajeno se devuelve tal cual para no ocultarlo', () => {
    const other = new TypeError('no es nuestro');
    expect(toAstroError(other, 'T')).toBe(other);
  });
});

describe('orAstroError', () => {
  it('devuelve el valor si no falla', () => {
    expect(orAstroError('T', () => 42)).toBe(42);
  });

  it('traduce un error del núcleo con el título dado', () => {
    function run() {
      return orAstroError('Config inválida', () => {
        throw new DocsError('x', { file: 'a.md' });
      });
    }
    expect(run).toThrow(AstroError);
    expect(run).toThrow('Config inválida');
  });

  it('deja pasar un error ajeno', () => {
    const other = new TypeError('no es nuestro');
    expect(() =>
      orAstroError('T', () => {
        throw other;
      }),
    ).toThrow(other);
  });
});
