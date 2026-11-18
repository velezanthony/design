import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import LocaleBadge from './LocaleBadge.astro';

async function badge(tone: 'error' | 'warning' | 'info' | 'ok' | 'missing') {
  return (await render(LocaleBadge, { locale: 'en', tone })).querySelector('[data-locale]')!;
}

describe('LocaleBadge', () => {
  it('muestra el idioma en mayúsculas y la gravedad también como texto oculto', async () => {
    const element = await badge('warning');
    expect(text(element)).toContain('EN');
    expect(element.querySelector('.sr-only')!.textContent).toContain('aviso');
  });

  it('el color nunca va solo: errores, avisos e informativos llevan un glifo distinto', async () => {
    async function glyph(tone: 'error' | 'warning' | 'info') {
      return (await badge(tone)).querySelector('[aria-hidden]')!.textContent;
    }
    expect(new Set([await glyph('error'), await glyph('warning'), await glyph('info')]).size).toBe(
      3,
    );
  });

  it('un idioma que no existe va tachado y con borde discontinuo', async () => {
    const element = await badge('missing');
    expect(element.classList.contains('line-through')).toBe(true);
    expect(element.classList.contains('border-dashed')).toBe(true);
    expect(element.querySelector('.sr-only')!.textContent).toContain('no existe');
  });
});
