import { describe, expect, it } from 'vitest';

import Rule from '../ui/atoms/Rule.astro';
import { render, text } from './render';

describe('render', () => {
  it('devuelve un documento consultable con el HTML del componente', async () => {
    const doc = await render(Rule);
    expect(doc.querySelector('hr')).not.toBeNull();
  });

  it('pasa las props al componente', async () => {
    const doc = await render(Rule, { marked: true });
    expect(doc.querySelector('hr')).toBeNull();
    expect(doc.body.firstElementChild?.querySelectorAll('span')).toHaveLength(2);
  });

  it('text colapsa el espacio y tolera nulos', () => {
    expect(text({ textContent: '  a \n  b ' })).toBe('a b');
    expect(text(null)).toBe('');
  });
});
