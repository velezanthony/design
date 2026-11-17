import { describe, expect, it } from 'vitest';
import { render, text } from '../../testing/render';
import { seoPage } from '../../testing/seo-page';
import PagesTable from './PagesTable.astro';

const row = (page = seoPage()) => ({
  page,
  href: `/repo/seo-on-page/page/?slug=${page.slug}&locale=${page.locale}`,
});

describe('PagesTable', () => {
  it('una fila enseña slug, idioma y el título final con su longitud contra el límite', async () => {
    const page = seoPage({
      slug: 'guide/intro',
      locale: 'es',
      meta: { ...seoPage().meta, title: 'x'.repeat(72), titleLength: 72 },
    });
    const doc = await render(PagesTable, { rows: [row(page)] });
    const cells = [...doc.querySelectorAll('tbody tr td, tbody tr th')].map((cell) => text(cell));
    expect(cells[0]).toContain('guide/intro');
    expect(cells[1]).toBe('es');
    expect(cells[2]).toContain('72 / 60');
  });

  it('la portada (slug vacío) se muestra como «/»', async () => {
    const doc = await render(PagesTable, { rows: [row(seoPage({ slug: '' }))] });
    expect(text(doc.querySelector('tbody th'))).toBe('/');
  });

  it('enlaza cada fila a su inspector', async () => {
    const doc = await render(PagesTable, { rows: [row()] });
    expect(doc.querySelector('tbody a')!.getAttribute('href')).toBe(
      '/repo/seo-on-page/page/?slug=guide&locale=en',
    );
  });

  it('dice de dónde sale la descripción y cuánto mide', async () => {
    const page = seoPage({
      meta: { ...seoPage().meta, descriptionSource: 'site', descriptionLength: 90 },
    });
    const doc = await render(PagesTable, { rows: [row(page)] });
    expect(text(doc.querySelector('tbody'))).toContain('Heredada del sitio');
    expect(text(doc.querySelector('tbody'))).toContain('90 / 160');
  });

  it('sin descripción no hay longitud que medir', async () => {
    const meta = { ...seoPage().meta, descriptionSource: 'none' as const };
    delete (meta as { descriptionLength?: number }).descriptionLength;
    delete (meta as { description?: string }).description;
    const doc = await render(PagesTable, { rows: [row(seoPage({ meta }))] });
    expect(text(doc.querySelector('tbody'))).toContain('Sin descripción');
    expect(text(doc.querySelector('tbody'))).not.toContain('/ 160');
  });

  it('pinta una insignia por problema de la fila', async () => {
    const page = seoPage({
      issues: [
        {
          kind: 'no-h1',
          severity: 'error',
          slug: 'guide',
          locale: 'en',
          message: 'm',
          value: 0,
          limit: 1,
        },
        { kind: 'duplicate-title', severity: 'warning', slug: 'guide', locale: 'en', message: 'm' },
      ],
    });
    const doc = await render(PagesTable, { rows: [row(page)] });
    const badges = [...doc.querySelectorAll('[data-severity]')];
    expect(badges.map((b) => b.getAttribute('data-severity'))).toEqual(['error', 'warning']);
  });

  it('sin filas dice que ninguna página cumple los filtros', async () => {
    const doc = await render(PagesTable, { rows: [] });
    expect(doc.querySelector('table')).toBeNull();
    expect(text(doc)).toContain('Ninguna página');
  });
});
