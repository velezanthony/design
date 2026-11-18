import { describe, expect, it } from 'vitest';
import type { SeoFilters, ViewState } from '../../../core/seo-on-page/queries/url-filters';
import { render, text } from '../../../testing/render';
import TableFooter from './TableFooter.astro';

const none: SeoFilters = { kinds: [], severities: [], locales: [], text: '' };
function footer(filters: SeoFilters = none, perPage = 25, view: ViewState = { view: 'page' }) {
  return render(TableFooter, {
    filters,
    perPage,
    view,
    action: '/repo/seo-on-page/pages/',
    from: 1,
    to: 10,
    total: 75,
    overall: 75,
    page: 1,
    pages: 8,
    href: (number: number) => `?page=${number}`,
  });
}

describe('TableFooter', () => {
  it('lleva las filas por página en su propio formulario GET, con el tamaño actual', async () => {
    const htmlDocument = await footer(none, 50);
    const form = htmlDocument.querySelector('form')!;
    expect(form.getAttribute('method')?.toLowerCase()).toBe('get');
    expect(form.getAttribute('action')).toBe('/repo/seo-on-page/pages/');
    const select = form.querySelector('select[name="per"]')!;
    expect(
      [...select.querySelectorAll('option')].map((option) => option.getAttribute('value')),
    ).toEqual(['10', '25', '50', '100']);
    expect(select.querySelector('option[selected]')!.getAttribute('value')).toBe('50');
    expect(htmlDocument.querySelector(`label[for="${select.id}"]`)!.textContent).toContain(
      'Filas por página',
    );
  });

  it('sin JavaScript se envía con un botón «Aplicar»', async () => {
    const button = (await footer()).querySelector('form button[type="submit"]')!;
    expect(button.textContent).toContain('Aplicar');
  });

  it('conserva los filtros activos como campos ocultos, y nunca la página', async () => {
    const htmlDocument = await footer({
      kinds: ['no-h1'],
      severities: ['error', 'warning'],
      locales: ['es'],
      text: 'orm',
    });
    const hidden = [...htmlDocument.querySelectorAll('form input[type="hidden"]')].map(
      (input) => `${input.getAttribute('name')}=${input.getAttribute('value')}`,
    );
    expect(hidden).toEqual([
      'kind=no-h1',
      'severity=error',
      'severity=warning',
      'locale=es',
      'q=orm',
    ]);
  });

  it('sin filtros no hay campos ocultos', async () => {
    expect((await footer()).querySelectorAll('form input[type="hidden"]')).toHaveLength(0);
  });

  it('reúne en una barra el recuento y el paginador', async () => {
    const htmlDocument = await footer();
    expect(text(htmlDocument)).toContain('1–10 de 75 páginas');
    expect(htmlDocument.querySelector('nav[aria-label]')).not.toBeNull();
  });

  it('conserva la vista (y la columna de «Qué tiene») como campos ocultos', async () => {
    const htmlDocument = await footer(none, 25, { view: 'have', lacks: 'og' });
    const hidden = [...htmlDocument.querySelectorAll('form input[type="hidden"]')].map((input) => [
      input.getAttribute('name'),
      input.getAttribute('value'),
    ]);
    expect(hidden).toEqual([
      ['view', 'have'],
      ['lacks', 'og'],
    ]);
  });

  it('el recuento habla de entradas en «Por idioma» y de páginas en el resto', async () => {
    expect(
      text((await footer(none, 25, { view: 'locale' })).querySelector('[role="status"]')),
    ).toContain('entradas');
    expect(text((await footer()).querySelector('[role="status"]'))).toContain('páginas');
  });
});
