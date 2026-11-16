import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { DocsError, DocsErrors } from '../../core/errors';
import { toAstroError } from './errors';

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
