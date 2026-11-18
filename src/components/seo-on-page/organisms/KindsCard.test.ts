import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import KindsCard from './KindsCard.astro';

const kinds = {
  rows: [
    {
      kind: 'title-too-short',
      severity: 'warning',
      pages: 1,
      percent: 3,
      certainty: 'heuristic',
      href: '/t/?kind=title-too-short',
    },
  ],
  clean: ['no-h1', 'multiple-h1'],
};

describe('KindsCard', () => {
  it('cada tipo con problemas lleva gravedad, certeza, páginas con porcentaje y enlace', async () => {
    const htmlDocument = await render(KindsCard, { kinds });
    const row = htmlDocument.querySelector('[data-kinds] [data-kind="title-too-short"]')!;
    expect(text(row)).toContain('Aviso');
    expect(text(row)).toContain('1 (3 %)');
    expect(row.querySelector('[data-certainty="heuristic"]')).not.toBeNull();
    expect(row.querySelector('a')!.getAttribute('href')).toBe('/t/?kind=title-too-short');
  });

  it('pliega los tipos sin problemas en un desplegable con su recuento', async () => {
    const htmlDocument = await render(KindsCard, { kinds });
    const clean = htmlDocument.querySelector('details[data-clean]')!;
    expect(text(clean.querySelector('summary'))).toBe('2 comprobaciones sin problemas');
    expect(clean.querySelectorAll('li')).toHaveLength(2);
  });

  it('si todo está limpio no hay tabla pero sí el desplegable', async () => {
    const htmlDocument = await render(KindsCard, { kinds: { rows: [], clean: ['no-h1'] } });
    expect(htmlDocument.querySelector('[data-kinds]')).toBeNull();
    expect(htmlDocument.querySelector('[data-empty]')).not.toBeNull();
    expect(text(htmlDocument.querySelector('summary'))).toBe('1 comprobación sin problemas');
  });
});
