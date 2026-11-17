import { describe, expect, it } from 'vitest';
import { render, text } from '../../testing/render';
import InfoHiddenNote from './InfoHiddenNote.astro';

describe('InfoHiddenNote', () => {
  it('dice que la tabla oculta lo informativo y enlaza a mostrarlo', async () => {
    const doc = await render(InfoHiddenNote, { showAllHref: '/t/?severity=error' });
    expect(text(doc)).toContain('informativas');
    const link = doc.querySelector<HTMLAnchorElement>('a');
    expect(link?.getAttribute('href')).toBe('/t/?severity=error');
    expect(text(link)).toContain('Mostrar también');
  });
});
