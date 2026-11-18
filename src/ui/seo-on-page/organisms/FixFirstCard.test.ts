import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import FixFirstCard from './FixFirstCard.astro';

const priority = {
  kind: 'title-too-short',
  severity: 'warning',
  pages: 1,
  percent: 3,
  entries: 2,
  locales: ['en', 'es'],
  certainty: 'heuristic',
  fix: 'Alarga `seo.title`.',
  affected: [{ slug: '', href: '/i/' }],
  href: '/t/?kind=title-too-short',
};
const footer = { problems: { pages: 3, href: '/t/' }, all: '/t/?all' };

describe('FixFirstCard', () => {
  it('cada tipo dice gravedad, alcance, certeza y cómo arreglarlo, y enlaza a la tabla', async () => {
    const doc = await render(FixFirstCard, { priorities: [priority], footer });
    const item = doc.querySelector('[data-kind="title-too-short"]')!;
    expect(text(item)).toContain('Aviso');
    expect(text(item)).toContain('1 página (3 %) · en y es');
    expect(item.querySelector('[data-certainty="heuristic"]')).not.toBeNull();
    expect(item.querySelector('[data-fix] code')!.textContent).toBe('seo.title');
    expect(item.querySelector('a[href="/t/?kind=title-too-short"]')).not.toBeNull();
  });

  it('la portada se lista como «/» y enlaza a su inspector', async () => {
    const doc = await render(FixFirstCard, { priorities: [priority], footer });
    expect(text(doc.querySelector('[data-affected] a[href="/i/"]'))).toBe('/');
  });

  it('sin páginas listadas (son demasiadas) no pinta la lista', async () => {
    const doc = await render(FixFirstCard, {
      priorities: [{ ...priority, affected: [] }],
      footer,
    });
    expect(doc.querySelector('[data-affected]')).toBeNull();
  });

  it('sin problemas el pie no ofrece ver páginas con problemas, solo todas', async () => {
    const doc = await render(FixFirstCard, {
      priorities: [],
      footer: { problems: undefined, all: '/t/?all' },
    });
    expect(doc.querySelector('[data-empty]')).not.toBeNull();
    expect(doc.querySelector('a[href="/t/"]')).toBeNull();
    expect(doc.querySelector('a[href="/t/?all"]')).not.toBeNull();
  });
});
