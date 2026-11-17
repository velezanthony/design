import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import HeadingsOutline from './HeadingsOutline.astro';

describe('HeadingsOutline', () => {
  it('marca el salto de nivel', async () => {
    const outline = [
      { depth: 1, slug: 'a', text: 'Uno' },
      { depth: 2, slug: 'b', text: 'Dos' },
      { depth: 4, slug: 'c', text: 'Cuatro', skipFrom: 2 },
    ];
    const doc = await render(HeadingsOutline, { outline });
    const items = [...doc.querySelectorAll('[data-outline] li')];
    expect(items).toHaveLength(3);
    expect(items[2]!.hasAttribute('data-skip')).toBe(true);
    expect(text(items[2])).toContain('H2 → H4');
    expect(items[1]!.hasAttribute('data-skip')).toBe(false);
  });

  it('sin encabezados lo dice', async () => {
    const doc = await render(HeadingsOutline, { outline: [] });
    expect(text(doc.querySelector('[data-outline-empty]'))).toContain('Sin encabezados');
  });
});
