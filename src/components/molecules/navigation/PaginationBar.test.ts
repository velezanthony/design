import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import PaginationBar from './PaginationBar.astro';

const slots = {
  start: '<form data-size>Por página</form>',
  status: '<p data-range>1–10 de 75</p>',
  default: '<nav data-pager>1 2 3</nav>',
};

describe('PaginationBar', () => {
  it('una sola fila que se parte: el tamaño a un lado; el rango y el paginador al otro', async () => {
    const document = await render(PaginationBar, {}, slots);
    const bar = document.querySelector('[data-pagination-bar]')!;
    expect(bar.getAttribute('class')).toContain('flex-wrap');
    expect(bar.getAttribute('class')).toContain('justify-between');
    const [start, end] = [...bar.children];
    expect(start!.hasAttribute('data-size')).toBe(true);
    expect([...end!.children].map((child) => child.tagName.toLowerCase())).toEqual(['p', 'nav']);
  });

  it('sin control de tamaño, el rango y el paginador siguen a la derecha', async () => {
    const document = await render(
      PaginationBar,
      {},
      { status: slots.status, default: slots.default },
    );
    const bar = document.querySelector('[data-pagination-bar]')!;
    expect(bar.children).toHaveLength(1);
    expect(bar.firstElementChild!.getAttribute('class')).toContain('ml-auto');
    expect(text(bar.querySelector('[data-range]'))).toBe('1–10 de 75');
    expect(bar.querySelector('[data-pager]')).not.toBeNull();
  });

  it('acepta clases propias', async () => {
    const document = await render(PaginationBar, { class: 'mt-10' }, slots);
    expect(document.querySelector('[data-pagination-bar]')!.getAttribute('class')).toContain(
      'mt-10',
    );
  });
});
