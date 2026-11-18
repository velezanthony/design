import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import NotFound from './NotFound.astro';

function page(props: Record<string, unknown> = {}) {
  return render(NotFound, {
    strings: stringsFor('es'),
    homeHref: '/repo/es/',
    baseUrl: '/repo/',
    ...props,
  });
}

describe('NotFound', () => {
  it('título h1, cuerpo, buscador y enlace a la portada del idioma', async () => {
    const doc = await page();
    expect(text(doc.querySelector('h1'))).toBe('Página no encontrada');
    expect(text(doc)).toContain('La página que buscas no existe o se ha movido.');
    expect(doc.querySelector('[data-search]')).not.toBeNull();
    const home = doc.querySelector('a[href="/repo/es/"]')!;
    expect(text(home)).toBe('Ir a la portada');
  });

  it('el buscador recibe la base', async () => {
    expect((await page()).querySelector('[data-search]')!.getAttribute('data-base-url')).toBe(
      '/repo/',
    );
  });

  it('usa los textos sobrescritos de notFound.* y otro idioma', async () => {
    const doc = await page({
      strings: stringsFor('en', { 'notFound.title': 'Lost', 'notFound.home': 'Take me home' }),
    });
    expect(text(doc.querySelector('h1'))).toBe('Lost');
    expect(text(doc.querySelector('a[href="/repo/es/"]'))).toBe('Take me home');
    expect(text(doc)).toContain('The page you are looking for does not exist or has moved.');
  });
});
