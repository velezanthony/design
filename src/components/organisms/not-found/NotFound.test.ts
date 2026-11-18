import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
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
    const htmlDocument = await page();
    expect(text(htmlDocument.querySelector('h1'))).toBe('Página no encontrada');
    expect(text(htmlDocument)).toContain('La página que buscas no existe o se ha movido.');
    expect(htmlDocument.querySelector('[data-search]')).not.toBeNull();
    const home = htmlDocument.querySelector('a[href="/repo/es/"]')!;
    expect(text(home)).toBe('Ir a la portada');
  });

  it('el buscador recibe la base', async () => {
    expect((await page()).querySelector('[data-search]')!.getAttribute('data-base-url')).toBe(
      '/repo/',
    );
  });

  it('usa los textos sobrescritos de notFound.* y otro idioma', async () => {
    const htmlDocument = await page({
      strings: stringsFor('en', { 'notFound.title': 'Lost', 'notFound.home': 'Take me home' }),
    });
    expect(text(htmlDocument.querySelector('h1'))).toBe('Lost');
    expect(text(htmlDocument.querySelector('a[href="/repo/es/"]'))).toBe('Take me home');
    expect(text(htmlDocument)).toContain(
      'The page you are looking for does not exist or has moved.',
    );
  });
});
