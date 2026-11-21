import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import DateLabel from './DateLabel.astro';

describe('DateLabel', () => {
  it('pinta un <time datetime> con la etiqueta que recibe, sin formatearla', async () => {
    const document = await render(DateLabel, {
      iso: '2026-11-21T10:00:00+00:00',
      label: 'ayer por la tarde',
    });
    const time = document.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2026-11-21T10:00:00+00:00');
    expect(text(time)).toBe('ayer por la tarde');
  });

  it('añade la clase que recibe', async () => {
    const document = await render(DateLabel, { iso: '2026-01-01', label: 'x', class: 'text-xs' });
    expect(document.querySelector('time')!.classList.contains('text-xs')).toBe(true);
  });
});
