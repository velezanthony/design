import { describe, expect, it } from 'vitest';
import { stepHtmlWrapper } from './html-wrappers';

describe('stepHtmlWrapper', () => {
  it('abre al ver `<div markdown>`, salta la línea y lo registra', () => {
    expect(stepHtmlWrapper('<div class="grid cards" markdown>', 0, 3)).toEqual({
      depth: 1,
      skip: true,
      log: [{ kind: 'html-wrapper', line: 3, detail: '<div class="grid cards" markdown>' }],
    });
  });

  it('cierra con `</div>` solo si hay uno abierto', () => {
    expect(stepHtmlWrapper('</div>', 1, 1)).toEqual({ depth: 0, skip: true, log: [] });
    expect(stepHtmlWrapper('</div>', 0, 1)).toEqual({ depth: 0, skip: false, log: [] });
  });

  it('dentro, salta el separador `---` con cuatro espacios de las tarjetas', () => {
    expect(stepHtmlWrapper('    ---', 1, 1).skip).toBe(true);
    expect(stepHtmlWrapper('---', 1, 1).skip).toBe(false);
    expect(stepHtmlWrapper('    ---', 0, 1).skip).toBe(false);
  });

  it('un `<div>` sin `markdown` no es un envoltorio', () => {
    expect(stepHtmlWrapper('<div class="x">', 0, 1).skip).toBe(false);
  });

  it('admite envoltorios anidados', () => {
    const open = stepHtmlWrapper('<div markdown>', 1, 1);
    expect(open.depth).toBe(2);
  });
});
