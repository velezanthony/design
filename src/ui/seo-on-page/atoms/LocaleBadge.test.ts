import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import LocaleBadge from './LocaleBadge.astro';

const badge = async (tone: 'error' | 'warning' | 'info' | 'ok' | 'missing') =>
  (await render(LocaleBadge, { locale: 'en', tone })).querySelector('[data-locale]')!;

describe('LocaleBadge', () => {
  it('muestra el idioma en mayúsculas y la gravedad también como texto oculto', async () => {
    const el = await badge('warning');
    expect(text(el)).toContain('EN');
    expect(el.querySelector('.sr-only')!.textContent).toContain('aviso');
  });

  it('el color nunca va solo: errores, avisos e informativos llevan un glifo distinto', async () => {
    const glyph = async (tone: 'error' | 'warning' | 'info') =>
      (await badge(tone)).querySelector('[aria-hidden]')!.textContent;
    expect(new Set([await glyph('error'), await glyph('warning'), await glyph('info')]).size).toBe(
      3,
    );
  });

  it('un idioma que no existe va tachado y con borde discontinuo', async () => {
    const el = await badge('missing');
    expect(el.classList.contains('line-through')).toBe(true);
    expect(el.classList.contains('border-dashed')).toBe(true);
    expect(el.querySelector('.sr-only')!.textContent).toContain('no existe');
  });
});
