import { describe, expect, it } from 'vitest';
import { colonsFor, directive, indentOf, replaceOutsideCode, takeBody } from './lines';

describe('indentOf', () => {
  it('cuenta los espacios iniciales', () => {
    expect(indentOf('    x')).toBe(4);
    expect(indentOf('x')).toBe(0);
  });
});

describe('takeBody', () => {
  it('toma el cuerpo indentado, lo desindenta y deja fuera las líneas en blanco finales', () => {
    const lines = ['!!! note', '', '    a', '', '    b', '', 'fin'];
    expect(takeBody(lines, 1, 0)).toEqual([['a', '', 'b'], 5]);
  });

  it('respeta la indentación de la cabecera', () => {
    const lines = ['  !!! note', '      a', '  fuera'];
    expect(takeBody(lines, 1, 2)).toEqual([['a'], 2]);
  });

  it('sin cuerpo devuelve una lista vacía', () => {
    expect(takeBody(['!!! note', 'fuera'], 1, 0)).toEqual([[], 1]);
  });
});

describe('colonsFor', () => {
  it('usa el mínimo si dentro no hay directivas', () => {
    expect(colonsFor(['x'], 3)).toBe(3);
  });

  it('envuelve con uno más que la directiva más ancha de dentro', () => {
    expect(colonsFor([':::note[N]', 'x', ':::'], 3)).toBe(4);
    expect(colonsFor(['::::tab[A]', ':::::x'], 3)).toBe(6);
  });

  it('no confunde unos dos puntos de texto con una directiva', () => {
    expect(colonsFor(['::: no'], 3)).toBe(3);
  });
});

describe('directive', () => {
  it('envuelve el cuerpo con la cabecera y el cierre', () => {
    expect(directive('note[T]', ['x'])).toEqual([':::note[T]', 'x', ':::']);
  });

  it('sube los dos puntos para envolver a los internos', () => {
    expect(directive('note', [':::tip', ':::'])).toEqual(['::::note', ':::tip', ':::', '::::']);
  });
});

describe('replaceOutsideCode', () => {
  function upper(match: RegExpMatchArray) {
    return match[0].toUpperCase();
  }

  it('sustituye fuera del código en línea y respeta el de dentro', () => {
    expect(replaceOutsideCode('a `a` a', /a/g, upper)).toBe('A `a` A');
  });

  it('una coincidencia que empieza fuera y contiene código sí vale', () => {
    expect(replaceOutsideCode('[`x`] y', /\[`x`\]/g, upper)).toBe('[`X`] y');
  });
});
