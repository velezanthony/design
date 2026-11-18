import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import PanelIntro from './PanelIntro.astro';

const intro = () => render(PanelIntro, { title: 'Resumen', strings: stringsFor('es') });

describe('PanelIntro', () => {
  it('el título de la pantalla es el h1', async () => {
    const doc = await intro();
    expect(text(doc.querySelector('h1'))).toBe('Resumen');
  });

  it('avisa de que es una herramienta solo de desarrollo, como nota', async () => {
    const doc = await intro();
    expect(doc.querySelector('aside[role="note"]')).not.toBeNull();
    expect(text(doc)).toMatch(/solo en desarrollo/i);
  });

  it('con una frase de apoyo la pone bajo el título; sin ella no pinta un párrafo vacío', async () => {
    const strings = stringsFor('es');
    const withLede = await render(PanelIntro, { title: 'Páginas', lede: 'Ordenadas.', strings });
    expect(text(withLede)).toContain('Ordenadas.');
    const without = (await intro()).querySelectorAll('p').length;
    expect(withLede.querySelectorAll('p')).toHaveLength(without + 1);
    expect(text(await intro())).not.toContain('Ordenadas.');
  });
});
