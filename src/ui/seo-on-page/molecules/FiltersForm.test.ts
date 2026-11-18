import { describe, expect, it } from 'vitest';
import type { SeoFilters, ViewState } from '../../../core/seo-on-page/queries/url-filters';
import type { KindOptions } from '../../../core/seo-on-page/pages/listing/kinds';
import { IssueKind } from '../../../core/seo-on-page/tree/types';
import { render, text } from '../../../testing/render';
import FiltersForm from './FiltersForm.astro';

const none: SeoFilters = { kinds: [], severities: [], locales: [], text: '' };
/** Tres tipos con incidencias y el resto sin, como un árbol real; `selected` vacío = «Todos». */
const WITH: IssueKind[] = [IssueKind.NO_H1, IssueKind.DUPLICATE_TITLE, IssueKind.TITLE_TOO_SHORT];
const kindOptions = (selected: IssueKind[] = []): KindOptions => {
  const all = selected.length === 0;
  return {
    all: { checked: all, count: WITH.length },
    withIssues: WITH.map((kind, index) => ({
      kind,
      count: 3 - index,
      checked: all || selected.includes(kind),
    })),
    without: Object.values(IssueKind).filter((kind) => !WITH.includes(kind)),
    summary: all ? 'todos' : `${selected.length} de ${WITH.length}`,
  };
};
const form = (filters: SeoFilters = none, perPage = 25, view: ViewState = { view: 'page' }) =>
  render(FiltersForm, {
    filters,
    perPage,
    view,
    severityCounts: { error: 0, warning: 3, info: 38 },
    clear: '/repo/seo-on-page/pages/',
    kinds: kindOptions(filters.kinds),
    locales: ['en', 'es'],
    action: '/repo/seo-on-page/pages/',
  });
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

  it('sin filtros no marca ninguna gravedad ni idioma', async () => {
    const doc = await form();
    expect(checked(doc, 'severity')).toEqual([]);
    expect(checked(doc, 'locale')).toEqual([]);
  });

  describe('Tipo de problema', () => {
    const kinds = async (filters: SeoFilters = none) =>
      (await form(filters)).querySelector('[data-kinds]')!;

    it('«Todos» va arriba, sin nombre (no viaja) y con el recuento de tipos con incidencias', async () => {
      const group = await kinds();
      const first = group.querySelector('input')!;
      expect(first.hasAttribute('data-kinds-all')).toBe(true);
      expect(first.hasAttribute('name')).toBe(false);
      const label = first.closest('label')!;
      expect(text(label)).toContain('Todos');
      expect(text(label.querySelector('span'))).toBe('3');
    });

    it('sin filtro de tipo «Todos» y todos los que tienen incidencias van marcados', async () => {
      const group = await kinds();
      expect(group.querySelector('[data-kinds-all]')!.hasAttribute('checked')).toBe(true);
      expect(
        [...group.querySelectorAll('input[name="kind"]:not([disabled])')].every((i) =>
          i.hasAttribute('checked'),
        ),
      ).toBe(true);
    });

    it('con un filtro, «Todos» va desmarcado y solo el elegido marcado', async () => {
      const group = await kinds({ ...none, kinds: ['no-h1'] });
      expect(group.querySelector('[data-kinds-all]')!.hasAttribute('checked')).toBe(false);
      expect(checked(group.ownerDocument, 'kind')).toEqual(['no-h1']);
    });

    it('los tipos sin incidencias van después, deshabilitados y con su propio encabezado', async () => {
      const group = await kinds();
      const disabled = [...group.querySelectorAll('input[name="kind"][disabled]')];
      expect(disabled).toHaveLength(10);
      expect(text(group)).toContain('Sin incidencias (10)');
      expect(text(group)).toContain('Con incidencias');
    });

    it('cada tipo lleva su recuento de páginas', async () => {
      const count = async (kind: string) =>
        text(
          (await kinds())
            .querySelector(`input[value="${kind}"]`)!
            .closest('label')!
            .querySelector('span'),
        );
      expect(await count('no-h1')).toBe('3');
      expect(await count('duplicate-title')).toBe('2');
    });

    it('el resumen dice «todos» o «N de M» y trae las plantillas para el cliente', async () => {
      const all = (await form()).querySelector('[data-kinds-count]')!;
      expect(text(all)).toBe('· todos');
      expect(all.getAttribute('data-label-some')).toBe('· {on} de {total}');
      const some = (await form({ ...none, kinds: ['no-h1'] })).querySelector('[data-kinds-count]')!;
      expect(text(some)).toBe('· 1 de 3');
    });
  });

  it('el desplegable de tipos parte cerrado: es un popover, no una sección que empuja la tabla', async () => {
    expect((await form()).querySelector('details')!.hasAttribute('open')).toBe(false);
    const filtered = await form({ ...none, kinds: ['no-h1'] });
    expect(filtered.querySelector('details')!.hasAttribute('open')).toBe(false);
  });

  it('el botón de limpiar enlaza a donde dice el modelo (la vista se conserva)', async () => {
    const doc = await form({ ...none, text: 'x' }, 25, { view: 'locale' });
    expect(doc.querySelector('a[data-clear]')!.getAttribute('href')).toBe(
      '/repo/seo-on-page/pages/',
    );
  });

  it('las gravedades y los idiomas son fichas: la casilla se esconde y la ficha dice el recuento', async () => {
    const doc = await form();
    const warning = doc.querySelector('input[name="severity"][value="warning"]')!;
    expect(warning.classList.contains('sr-only')).toBe(true);
    expect(text(warning.closest('label'))).toContain('Avisos');
    expect(text(warning.closest('label'))).toContain('3');
    expect(text(doc.querySelector('input[name="locale"][value="es"]')!.closest('label'))).toContain(
      'ES',
    );
  });

  it('las fichas y la búsqueda envían solas; el desplegable de tipos, con su botón', async () => {
    const doc = await form();
    expect(doc.querySelector('input[name="q"]')!.hasAttribute('data-auto-submit')).toBe(true);
    expect(
      doc.querySelector('input[name="severity"]')!.closest('[data-auto-submit]'),
    ).not.toBeNull();
    expect(doc.querySelector('input[name="locale"]')!.closest('[data-auto-submit]')).not.toBeNull();
    const kinds = doc.querySelector('[data-kinds]')!;
    expect(kinds.closest('[data-auto-submit]')).toBeNull();
    expect(kinds.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('la vista viaja oculta para que filtrar no la deshaga', async () => {
    const hidden = (await form(none, 25, { view: 'have', lacks: 'og' })).querySelectorAll(
      'input[type="hidden"]',
    );
    expect([...hidden].map((i) => [i.getAttribute('name'), i.getAttribute('value')])).toEqual([
      ['view', 'have'],
      ['lacks', 'og'],
    ]);
    expect((await form()).querySelector('input[name="view"]')).toBeNull();
  });

  it('el desplegable de tipos y el botón de filtrar son clicables y lo parecen', async () => {
    const doc = await form();
    expect(doc.querySelector('summary')!.classList.contains('cursor-pointer')).toBe(true);
    const submit = doc.querySelector('button[type="submit"]')!;
    expect(submit.classList.contains('cursor-pointer')).toBe(true);
  });

  it('ya no ofrece las filas por página: es un control de la tabla, no un filtro', async () => {
    const doc = await form(none, 50);
    expect(doc.querySelector('select')).toBeNull();
  });

  it('conserva un tamaño de página distinto del de por defecto con un campo oculto', async () => {
    const hidden = (await form(none, 50)).querySelector('input[type="hidden"][name="per"]')!;
    expect(hidden.getAttribute('value')).toBe('50');
  });

  it('con el tamaño por defecto no añade ningún campo `per`', async () => {
    expect((await form(none, 25)).querySelector('input[name="per"]')).toBeNull();
  });
});
