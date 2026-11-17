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
    expect(text(doc)).toContain('solo en desarrollo');
  });
});
