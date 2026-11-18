import { describe, expect, it } from 'vitest';

import { render } from '../../../testing/render';
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
    ['danger', 'text-danger'],
  ])('el tono %s usa %s', async (tone, className) => {
    expect((await render(Tag, { tone })).querySelector('span')!.classList.contains(className)).toBe(
      true,
    );
  });

  it('el punto es decorativo', async () => {
    const dot = (await render(Tag, { dot: true })).querySelector('span span')!;
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });

  it('por defecto es una etiqueta de mayúsculas, sin caja', async () => {
    const span = (await render(Tag)).querySelector('span')!;
    expect(span.classList.contains('label')).toBe(true);
    expect(span.classList.contains('border')).toBe(false);
  });

  it('con bordered se enmarca con el color de su tono', async () => {
    const span = (await render(Tag, { bordered: true })).querySelector('span')!;
    expect(span.classList.contains('border')).toBe(true);
    expect(span.classList.contains('border-current')).toBe(true);
  });

  it('con plain lleva texto normal, para frases, y no la tipografía de etiqueta', async () => {
    const span = (await render(Tag, { plain: true })).querySelector('span')!;
    expect(span.classList.contains('label')).toBe(false);
    expect(span.classList.contains('whitespace-nowrap')).toBe(true);
  });

  it('propaga title y data-* al elemento', async () => {
    const span = (await render(Tag, { title: 'ayuda', 'data-kind': 'x' })).querySelector('span')!;
    expect(span.getAttribute('title')).toBe('ayuda');
    expect(span.getAttribute('data-kind')).toBe('x');
  });
});
