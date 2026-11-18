import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import LocaleSwitch from './LocaleSwitch.astro';

const hrefs = { es: '/es/install/', en: '/install/' };
function switcher(props: Record<string, unknown>) {
  return render(LocaleSwitch, { strings: stringsFor('en'), ...props });
}

describe('LocaleSwitch', () => {
  it('con gemela enlaza cada idioma con hreflang', async () => {
    const htmlDocument = await switcher({ lang: 'en', hrefs });
    const links = [...htmlDocument.querySelectorAll('a')].map((anchor) => [
      anchor.getAttribute('hreflang'),
      anchor.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['es', '/es/install/'],
      ['en', '/install/'],
    ]);
  });

  it('marca solo el idioma actual con aria-current', async () => {
    const htmlDocument = await switcher({ lang: 'en', hrefs });
    expect(
      [...htmlDocument.querySelectorAll('[aria-current]')].map((node) => node.getAttribute('lang')),
    ).toEqual(['en']);
  });

  it('sin gemela no hay enlace roto ni a otro idioma', async () => {
    const htmlDocument = await switcher({ lang: 'en', hrefs: { en: '/changelog/' } });
    expect(htmlDocument.querySelector('a[hreflang="es"]')).toBeNull();
    expect(htmlDocument.querySelectorAll('a[href=""], a:not([href])')).toHaveLength(0);
  });

  it('nombra cada idioma en el suyo y con lang propio', async () => {
    const htmlDocument = await switcher({ lang: 'es', hrefs, strings: stringsFor('es') });
    const english = htmlDocument.querySelector('a[hreflang="en"]')!;
    expect(english.getAttribute('lang')).toBe('en');
    expect(text(english.querySelector('.sr-only'))).toBe('English');
    expect(text(htmlDocument.querySelector('a[hreflang="es"] .sr-only'))).toBe('Español');
  });

  it('respeta el orden de locales que le da el contenedor', async () => {
    const htmlDocument = await switcher({ lang: 'en', hrefs, locales: ['en', 'es'] });
    expect(
      [...htmlDocument.querySelectorAll('a')].map((anchor) => anchor.getAttribute('hreflang')),
    ).toEqual(['en', 'es']);
  });

  it('el nombre accesible de la navegación sale de strings', async () => {
    expect(
      (await switcher({ lang: 'en', hrefs })).querySelector('nav')?.getAttribute('aria-label'),
    ).toBe('Language');
    const es = await switcher({
      lang: 'es',
      hrefs,
      strings: stringsFor('es', { 'locale.switch': 'Lengua' }),
    });
    expect(es.querySelector('nav')?.getAttribute('aria-label')).toBe('Lengua');
  });

  /* WCAG 2.5.8: cada enlace de idioma de al menos 24px. */
  it('da a cada idioma un objetivo de 24px', async () => {
    const htmlDocument = await switcher({ lang: 'en', hrefs });
    for (const anchor of htmlDocument.querySelectorAll('a'))
      expect(anchor.classList.contains('min-h-6')).toBe(true);
  });

  /* Ruta de reserva (7.6): el idioma actual no tiene página propia → marcado y sin enlace; el
     original sí se enlaza. */
  it('en una ruta de reserva marca el actual sin enlace y enlaza el original', async () => {
    const htmlDocument = await switcher({
      lang: 'es',
      hrefs: { en: '/changelog/' },
      locales: ['en', 'es'],
    });
    const current = htmlDocument.querySelector('[aria-current]')!;
    expect(current.tagName).toBe('SPAN');
    expect(current.hasAttribute('href')).toBe(false);
    expect(text(current)).toContain('es');
    const original = htmlDocument.querySelector('a')!;
    expect(original.getAttribute('hreflang')).toBe('en');
    expect(original.getAttribute('href')).toBe('/changelog/');
    expect(htmlDocument.querySelectorAll('a')).toHaveLength(1);
  });

  it('un idioma sin nombre conocido usa su código', async () => {
    const htmlDocument = await switcher({ lang: 'en', hrefs: { en: '/a/', fr: '/fr/a/' } });
    expect(text(htmlDocument.querySelector('a[hreflang="fr"] .sr-only'))).toBe('fr');
  });
});
