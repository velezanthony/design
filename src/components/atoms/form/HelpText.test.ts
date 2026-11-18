import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import HelpText from './HelpText.astro';

describe('HelpText', () => {
  it('lleva el id que le da quien lo enlaza y su texto', async () => {
    const help = (
      await render(HelpText, { id: 'email-help' }, { default: 'Nunca lo compartimos.' })
    ).querySelector('#email-help')!;
    expect(text(help)).toBe('Nunca lo compartimos.');
  });
});
