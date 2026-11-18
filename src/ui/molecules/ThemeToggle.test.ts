import { describe, expect, it } from 'vitest';

import { render } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import ThemeToggle from './ThemeToggle.astro';

async function button(props: Record<string, unknown>) {
  return (await render(ThemeToggle, props)).querySelector('button')!;
}

describe('ThemeToggle', () => {
  /* Es el gancho que `initTheme` busca: sin él nadie lo cablea. */
  it('es un botón con el atributo data-theme-toggle y no envía formularios', async () => {
    const element = await button({ strings: stringsFor('en') });
    expect(element.hasAttribute('data-theme-toggle')).toBe(true);
    expect(element.getAttribute('type')).toBe('button');
  });

  it('nace sin pulsar: aria-pressed lo sincroniza el cliente', async () => {
    expect((await button({ strings: stringsFor('en') })).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('el nombre accesible sale de strings en cada idioma', async () => {
    expect((await button({ strings: stringsFor('en') })).getAttribute('aria-label')).toBe(
      'Toggle color theme',
    );
    expect((await button({ strings: stringsFor('es') })).getAttribute('aria-label')).toBe(
      'Cambiar el tema de color',
    );
  });

  it('sobrescribir la clave en strings cambia el nombre accesible', async () => {
    const element = await button({ strings: stringsFor('en', { 'theme.toggle': 'Dark mode' }) });
    expect(element.getAttribute('aria-label')).toBe('Dark mode');
    expect(element.getAttribute('title')).toBe('Dark mode');
  });

  it('lleva los dos iconos decorativos', async () => {
    const svgs = [...(await button({ strings: stringsFor('en') })).querySelectorAll('svg')];
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
