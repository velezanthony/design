import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import DocsFooter from './DocsFooter.astro';
import DocsHeader from './DocsHeader.astro';

const header = (props: Record<string, unknown> = {}) =>
  render(DocsHeader, {
    siteName: 'Design',
    homeHref: '/repo/es/',
    lang: 'es',
    hrefs: { es: '/repo/es/x/', en: '/repo/en/x/' },
    strings: stringsFor('es'),
    ...props,
  });

describe('DocsHeader', () => {
  it('el enlace de salto es lo primero y apunta al contenido principal', async () => {
    const doc = await header();
    const first = doc.querySelector('a, button')!;
    expect(first.getAttribute('href')).toBe('#main-content');
    expect(text(first)).toBe('Saltar al contenido');
  });

  it('el destino del salto es configurable', async () => {
    const first = (await header({ mainId: 'contenido' })).querySelector('a')!;
    expect(first.getAttribute('href')).toBe('#contenido');
  });

  it('tiene un único landmark header con el nombre del sitio enlazando a la portada', async () => {
    const doc = await header();
    expect(doc.querySelectorAll('header')).toHaveLength(1);
    const home = doc.querySelector('header a[href="/repo/es/"]')!;
    expect(text(home)).toBe('Design');
  });

  it('incluye selector de idioma y de tema, y una ranura para lo demás', async () => {
    const doc = await render(
      DocsHeader,
      {
        siteName: 'D',
        homeHref: '/',
        lang: 'es',
        hrefs: { es: '/es/', en: '/en/' },
        strings: stringsFor('es'),
      },
      { default: '<div id="extra">buscador</div>' },
    );
    expect(doc.querySelector('header nav[aria-label="Idioma"]')).not.toBeNull();
    expect(doc.querySelector('header [data-theme-toggle]')).not.toBeNull();
    expect(doc.querySelector('header #extra')).not.toBeNull();
  });

  it('sin rutas ni textos del portfolio', async () => {
    const html = (await header()).body.innerHTML;
    expect(html).not.toMatch(/Proyectos|Experiencia|\/cv|portfolio/i);
  });
});

const footer = (props: Record<string, unknown> = {}) =>
  render(DocsFooter, { siteName: 'Design', year: 2026, strings: stringsFor('es'), ...props });

describe('DocsFooter', () => {
  it('es el landmark footer con el copyright que se le pasa', async () => {
    const doc = await footer();
    expect(doc.querySelectorAll('footer')).toHaveLength(1);
    expect(text(doc.querySelector('footer'))).toContain('© 2026 Design');
  });

  it('el año va por props: la misma salida siempre', async () => {
    expect(text(await footer({ year: 2030 }))).toContain('© 2030');
  });

  it('enlaces del consumidor y privacidad solo si se pasan', async () => {
    const bare = await footer();
    expect(bare.querySelector('a')).toBeNull();
    const doc = await footer({
      privacyUrl: '/privacidad/',
      links: [{ label: 'Código', href: 'https://github.com/x/y' }],
    });
    expect(doc.querySelector('a[href="/privacidad/"]')).not.toBeNull();
    expect(text(doc.querySelector('a[href="/privacidad/"]'))).toBe('Política de privacidad');
    expect(text(doc.querySelector('a[href="https://github.com/x/y"]'))).toBe('Código');
  });

  it('el control de cookies es un botón solo con cookieControl', async () => {
    expect((await footer()).querySelector('[data-consent-open]')).toBeNull();
    const button = (await footer({ cookieControl: true })).querySelector('[data-consent-open]')!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(text(button)).toBe('Preferencias de cookies');
  });

  it('otro idioma', async () => {
    const doc = await footer({ strings: stringsFor('en'), cookieControl: true });
    expect(text(doc.querySelector('[data-consent-open]'))).toBe('Cookie preferences');
  });
});
