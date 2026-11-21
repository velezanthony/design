import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import { items } from '../../../testing/index-items';
import IndexCards from './IndexCards.astro';

async function cards() {
  const document = await render(IndexCards, { items, strings: stringsFor('es'), lang: 'es' });
  return [...document.querySelectorAll('[data-index-card]')];
}

describe('IndexCards', () => {
  it('una tarjeta por entrada: camino, título enlazado, resumen y fecha', async () => {
    const [dns, git] = await cards();
    expect(text(dns!.querySelector('[data-index-path]'))).toBe('Sistemas › Redes');
    const link = git!.querySelector('h2 a')!;
    expect(link.getAttribute('href')).toBe('/repo/articulos/git/');
    expect(text(link)).toBe('Deshacer errores en Git');
    expect(text(git!.querySelector('p.line-clamp-3'))).toBe('Restore, reset y reflog.');
    expect(git!.querySelector('time')!.getAttribute('datetime')).toBe('2026-11-21T10:00:00+00:00');
    expect(text(git!.querySelector('time'))).toBe('21 nov 2026');
  });

  it('lo que no tiene commit no lleva fecha ni texto en su lugar', async () => {
    const [dns] = await cards();
    expect(dns!.querySelector('time')).toBeNull();
    expect(text(dns!)).not.toContain('publicar');
  });

  it('la portada de la librería, oculta y con el último grupo como etiqueta', async () => {
    const [dns] = await cards();
    const cover = dns!.querySelector('[data-cover-placeholder]')!;
    expect(cover.getAttribute('aria-hidden')).toBe('true');
    expect(text(cover)).toBe('Redes');
  });

  it('una imagen real va encima de la de la librería, decorativa por defecto', async () => {
    const [, git] = await cards();
    const image = git!.querySelector('img')!;
    expect(image.getAttribute('src')).toBe('/repo/_astro/git.webp');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(git!.querySelector('[data-cover-placeholder]')).not.toBeNull();
  });

  it('sin portada no hay caja de imagen; el enlace al original lleva su insignia', async () => {
    const [, , aws] = await cards();
    expect(aws!.querySelector('[data-index-cover]')).toBeNull();
    expect(aws!.querySelector('a')!.getAttribute('hreflang')).toBe('en');
    expect(aws!.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(
      'Disponible en English',
    );
  });

  it('con `visible`, las entradas de más van ocultas (las enseña el selector «Por página»)', async () => {
    const document = await render(IndexCards, {
      items,
      strings: stringsFor('es'),
      lang: 'es',
      visible: 2,
    });
    const entries = [...document.querySelectorAll('[data-index-item]')];
    expect(entries.map((entry) => entry.hasAttribute('hidden'))).toEqual([false, false, true]);
  });
});
