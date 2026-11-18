import { describe, expect, it } from 'vitest';
import { render, text } from '../../../../testing/render';
import CoverageCard from './CoverageCard.astro';

const row = {
  slug: 'changelog',
  title: 'Changelog',
  href: '/i/changelog',
  tags: [{ kind: 'external' }],
  cells: [
    { locale: 'en', state: 'exists' },
    { locale: 'es', state: 'missing' },
  ],
  hreflang: 'unpaired',
  xDefault: undefined,
  complete: false,
};
const base = {
  pages: 38,
  complete: 37,
  partial: 1,
  incomplete: [row],
  moreIncomplete: 0,
  reciprocal: 37,
  rows: [],
  locales: ['en', 'es'],
  href: '/t/?view=matrix',
};

describe('CoverageCard', () => {
  it('la tabla solo lleva las incompletas y una fila resume las completas', async () => {
    const htmlDocument = await render(CoverageCard, { coverage: base });
    expect(
      [...htmlDocument.querySelectorAll('[data-page]')].map((tr) => tr.getAttribute('data-page')),
    ).toEqual(['changelog']);
    expect(text(htmlDocument.querySelector('[data-rest]'))).toContain('37 páginas más');
    expect(htmlDocument.querySelector('a[href="/t/?view=matrix"]')).not.toBeNull();
  });

  it('con todo completo no hay tabla', async () => {
    const htmlDocument = await render(CoverageCard, {
      coverage: { ...base, complete: 38, partial: 0, incomplete: [] },
    });
    expect(htmlDocument.querySelector('[data-incomplete]')).toBeNull();
  });

  it('afirma que el hreflang es recíproco solo si lo es en todas las completas', async () => {
    const yes = await render(CoverageCard, { coverage: base });
    expect(text(yes.querySelector('[data-note]'))).toContain('Hoy las 37 páginas completas');
    const no = await render(CoverageCard, { coverage: { ...base, reciprocal: 36 } });
    expect(text(no.querySelector('[data-note]'))).not.toContain('Hoy');
  });

  it('dice cuántas incompletas no caben en la tarjeta', async () => {
    const htmlDocument = await render(CoverageCard, { coverage: { ...base, moreIncomplete: 4 } });
    expect(text(htmlDocument.querySelector('[data-more-incomplete]'))).toContain(
      '4 incompletas más',
    );
  });
});
