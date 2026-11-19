import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import SectionHead from './SectionHead.astro';

const action = { href: '/todo/', label: 'Ver todo' };

describe('SectionHead', () => {
  it('sin título, la acción va en la línea de la etiqueta y no hay encabezado', async () => {
    const document = await render(SectionHead, { eyebrow: 'Proyectos', action });
    expect(document.querySelector('h2')).toBeNull();
    expect(text(document.querySelector('p'))).toBe('Proyectos');
    expect(document.querySelectorAll('a')).toHaveLength(1);
    expect(document.querySelector('p')!.parentElement!.querySelector('a')).not.toBeNull();
  });

  it('con título, la acción acompaña al encabezado y no se repite', async () => {
    const document = await render(SectionHead, {
      eyebrow: 'Proyectos',
      title: 'Lo último',
      action,
    });
    const heading = document.querySelector('h2')!;
    expect(text(heading)).toBe('Lo último');
    expect(document.querySelectorAll('a')).toHaveLength(1);
    expect(heading.parentElement!.querySelector('a')!.getAttribute('href')).toBe('/todo/');
  });

  it('el nivel y el id llegan al encabezado', async () => {
    const heading = (
      await render(SectionHead, { eyebrow: 'x', title: 'y', level: 3, id: 'proyectos' })
    ).querySelector('h3')!;
    expect(heading.id).toBe('proyectos');
  });
});
