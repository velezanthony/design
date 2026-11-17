import { describe, expect, it } from 'vitest';
import type { SeoFilters } from '../../core/seo-on-page/queries/url-filters';
import { render } from '../../testing/render';
import FiltersForm from './FiltersForm.astro';

const none: SeoFilters = { kinds: [], severities: [], locales: [], text: '' };
const form = (filters: SeoFilters = none) =>
  render(FiltersForm, { filters, locales: ['en', 'es'], action: '/repo/seo-on-page/pages/' });
const checked = (doc: Document, name: string) =>
  [...doc.querySelectorAll(`input[name="${name}"]`)]
    .filter((input) => input.hasAttribute('checked'))
    .map((input) => input.getAttribute('value'));

describe('FiltersForm', () => {
  it('es un GET a la tabla: los filtros viajan en la URL, sin JavaScript', async () => {
    const f = (await form()).querySelector('form')!;
    expect(f.getAttribute('method')?.toLowerCase()).toBe('get');
    expect(f.getAttribute('action')).toBe('/repo/seo-on-page/pages/');
  });

  it('ofrece cada gravedad, cada idioma de la config y cada tipo de problema', async () => {
    const doc = await form();
    expect(doc.querySelectorAll('input[name="severity"]')).toHaveLength(3);
    expect(doc.querySelectorAll('input[name="locale"]')).toHaveLength(2);
    expect(doc.querySelectorAll('input[name="kind"]')).toHaveLength(13);
  });

  it('refleja los filtros activos marcados', async () => {
    const doc = await form({
      kinds: ['no-h1'],
      severities: ['error', 'warning'],
      locales: ['es'],
      text: 'orm',
    });
    expect(checked(doc, 'kind')).toEqual(['no-h1']);
    expect(checked(doc, 'severity')).toEqual(['error', 'warning']);
    expect(checked(doc, 'locale')).toEqual(['es']);
    expect(doc.querySelector('input[name="q"]')!.getAttribute('value')).toBe('orm');
  });

  it('sin filtros no marca nada', async () => {
    const doc = await form();
    expect(checked(doc, 'kind')).toEqual([]);
    expect(checked(doc, 'severity')).toEqual([]);
  });

  it('un filtro de tipo activo deja abierto el desplegable de tipos', async () => {
    expect((await form()).querySelector('details')!.hasAttribute('open')).toBe(false);
    const open = await form({ ...none, kinds: ['no-h1'] });
    expect(open.querySelector('details')!.hasAttribute('open')).toBe(true);
  });

  it('el botón de limpiar enlaza a la tabla sin query', async () => {
    const doc = await form({ ...none, text: 'x' });
    expect(doc.querySelector('a[data-clear]')!.getAttribute('href')).toBe(
      '/repo/seo-on-page/pages/',
    );
  });

  it('el desplegable de tipos y el botón de filtrar son clicables y lo parecen', async () => {
    const doc = await form();
    expect(doc.querySelector('summary')!.classList.contains('cursor-pointer')).toBe(true);
    const submit = doc.querySelector('button[type="submit"]')!;
    expect(submit.classList.contains('cursor-pointer')).toBe(true);
  });
});
