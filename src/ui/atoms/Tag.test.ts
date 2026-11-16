import { describe, expect, it } from 'vitest';

import { render } from '../../testing/render';
import Tag from './Tag.astro';

describe('Tag', () => {
  it('es neutro por defecto y sin punto', async () => {
    const span = (await render(Tag)).querySelector('span')!;
    expect(span.classList.contains('text-muted')).toBe(true);
    expect(span.querySelector('[aria-hidden]')).toBeNull();
  });

  it.each([
    ['accent', 'text-accent'],
    ['faint', 'text-faint'],
    ['live', 'text-state-live'],
    ['wip', 'text-state-wip'],
  ])('el tono %s usa %s', async (tone, cls) => {
    expect((await render(Tag, { tone })).querySelector('span')!.classList.contains(cls)).toBe(true);
  });

  it('el punto es decorativo', async () => {
    const dot = (await render(Tag, { dot: true })).querySelector('span span')!;
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });
});
