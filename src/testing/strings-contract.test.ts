import { describe, expect, it } from 'vitest';

import Probe from './fixtures/StringsProbe.astro';
import { render, text } from './render';
import { stringsFor } from './strings';

/* Ningún átomo pinta texto propio (Link, Icon, Heading, Tag y Rule solo llevan slot), así que el
   contrato «el texto sale de la prop `strings` vía `t()`» se fija con un componente sonda. Las
   moléculas con texto (fase 7) lo repiten sobre componentes reales. */
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
    const doc = await render(Probe, { strings: stringsFor('en', { 'toc.title': 'Contents' }) });
    expect(text(doc.querySelector('h2'))).toBe('Contents');
  });

  it('interpola variables con t()', async () => {
    const doc = await render(Probe, { strings: stringsFor('es'), locale: 'English' });
    expect(doc.querySelector('p')?.textContent).toBe('Disponible en English');
  });
});
