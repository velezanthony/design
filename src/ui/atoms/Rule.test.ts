import { describe, expect, it } from 'vitest';

import { render } from '../../testing/render';
import Rule from './Rule.astro';

describe('Rule', () => {
  it('es un separador cuando es simple', async () => {
    expect((await render(Rule)).querySelector('hr')).not.toBeNull();
  });

  /* Un `div` no tiene rol que quitar; `presentation` solo añadiría ruido. */
  it('no añade rol a la variante marcada', async () => {
    const rule = (await render(Rule, { marked: true })).body.firstElementChild!;
    expect(rule.hasAttribute('role')).toBe(false);
  });
});
