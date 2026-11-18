import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import InfoHiddenNote from './InfoHiddenNote.astro';

describe('InfoHiddenNote', () => {
  it('dice que la tabla oculta lo informativo y enlaza a mostrarlo', async () => {
    const htmlDocument = await render(InfoHiddenNote, { showAllHref: '/t/?severity=error' });
    expect(text(htmlDocument)).toContain('informativas');
    const link = htmlDocument.querySelector<HTMLAnchorElement>('a');
    expect(link?.getAttribute('href')).toBe('/t/?severity=error');
    expect(text(link)).toContain('Mostrar también');
  });

  it('separa la frase del enlace con un espacio', async () => {
    const htmlDocument = await render(InfoHiddenNote, { showAllHref: '/p/' });
    expect(
      htmlDocument.querySelector('[data-info-hidden]')?.textContent?.replace(/\s+/g, ' '),
    ).toContain('sin problemas. Mostrar');
  });
});
