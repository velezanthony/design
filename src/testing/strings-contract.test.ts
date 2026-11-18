import { describe, expect, it } from 'vitest';

import Probe from './fixtures/StringsProbe.astro';
import { render, text } from './render';
import { stringsFor } from './strings';

/* Ningún átomo pinta texto propio, así que el contrato «el texto sale de `strings` vía `translate()`» se fija con un componente sonda. */
describe('contrato de textos por props', () => {
  it('pinta el texto del catálogo del idioma recibido', async () => {
    expect(text((await render(Probe, { strings: stringsFor('es') })).querySelector('h2'))).toBe(
      'En esta página',
    );
    expect(text((await render(Probe, { strings: stringsFor('en') })).querySelector('h2'))).toBe(
      'On this page',
    );
  });

  it('sobrescribir una clave en la prop cambia la salida', async () => {
    const htmlDocument = await render(Probe, {
      strings: stringsFor('en', { 'toc.title': 'Contents' }),
    });
    expect(text(htmlDocument.querySelector('h2'))).toBe('Contents');
  });

  it('interpola variables con translate()', async () => {
    const htmlDocument = await render(Probe, { strings: stringsFor('es'), locale: 'English' });
    expect(htmlDocument.querySelector('p')?.textContent).toBe('Disponible en English');
  });
});
