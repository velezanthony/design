import { describe, expect, it } from 'vitest';

import { wrapScrollableTables } from './scrollable-tables';

const table = '<table class="x"><tr><td>a</td></tr></table>';

describe('wrapScrollableTables', () => {
  it('envuelve cada tabla en un div.table-scroll enfocable', () => {
    expect(wrapScrollableTables(`<p>a</p>${table}<p>b</p>${table}`)).toBe(
      `<p>a</p><div class="table-scroll" tabindex="0">${table}</div><p>b</p>` +
        `<div class="table-scroll" tabindex="0">${table}</div>`,
    );
  });

  it('deja como está una tabla que ya va en su .table-scroll (escrita a mano en el Markdown)', () => {
    const wrapped = `<div class="table-scroll" tabindex="0">\n${table}</div>`;
    expect(wrapScrollableTables(wrapped)).toBe(wrapped);
  });

  it('sin tablas no cambia nada', () => {
    expect(wrapScrollableTables('<p>tabla</p>')).toBe('<p>tabla</p>');
  });
});
