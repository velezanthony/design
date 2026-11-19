import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import InlineList from './InlineList.astro';

describe('InlineList', () => {
  it('pinta un li por elemento, en orden', async () => {
    const items = [
      ...(await render(InlineList, { items: ['a', 'b', 'c'] })).querySelectorAll('li'),
    ];
    expect(items.map((item) => text(item))).toEqual(['a', 'b', 'c']);
  });

  it('sin elementos no pinta nada', async () => {
    expect((await render(InlineList, { items: [] })).querySelector('ul')).toBeNull();
  });
});
