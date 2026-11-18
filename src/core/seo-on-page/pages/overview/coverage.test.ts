import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import type { SeoLocaleEntry, SeoPage } from '../../tree/types';
import { coverage, MAX_INCOMPLETE_ROWS } from './coverage';

const input = {
  locales: ['en', 'es'],
  defaultLocale: 'en',
  inspector: ({ slug, locale }: { slug: string; locale: string }) => `/i/${slug}/${locale}`,
};

function present(locale: string): SeoLocaleEntry {
  return { locale, status: 'present', url: '/' };
}
function missing(locale: string): SeoLocaleEntry {
  return {
    locale,
    status: 'missing',
    policy: 'link',
    declared: false,
  };
}

/** Una página en un idioma; `group` es cómo está el grupo entero (lo que dice cada entrada). */
function entry(slug: string, locale: string, group: SeoLocaleEntry[]): SeoPage {
  return seoPage({ slug, locale, locales: group });
}

function both(slug: string): SeoPage[] {
  return [
    entry(slug, 'en', [present('en'), present('es')]),
    entry(slug, 'es', [present('en'), present('es')]),
  ];
}
function onlyEn(slug: string): SeoPage {
  return entry(slug, 'en', [present('en'), missing('es')]);
}

/** La cobertura de un sitio con varios idiomas: siempre existe. */
function covered(pages: SeoPage[]) {
  const result = coverage({ pages }, input);
  if (!result) throw new Error('el sitio tiene dos idiomas: debe haber cobertura');
  return result;
}

describe('coverage', () => {
  it('cuenta páginas en todos los idiomas y páginas en alguno solo', () => {
    const pages = [...both('a'), ...both('b'), onlyEn('c')];
    expect(covered(pages)).toMatchObject({ pages: 3, complete: 2, partial: 1 });
  });

  it('la tabla solo lleva las incompletas', () => {
    const pages = [...both('a'), onlyEn('b')];
    const { incomplete } = covered(pages);
    expect(incomplete.map((row) => row.slug)).toEqual(['b']);
    expect(incomplete[0]!.cells.map((cell) => cell.state)).toEqual(['exists', 'missing']);
  });

  it('con muchas incompletas recorta la tabla y dice cuántas quedan fuera', () => {
    const pages = Array.from({ length: MAX_INCOMPLETE_ROWS + 3 }, (_item, index) =>
      onlyEn(`p${index}`),
    );
    const result = covered(pages);
    expect(result.incomplete).toHaveLength(MAX_INCOMPLETE_ROWS);
    expect(result.moreIncomplete).toBe(3);
  });

  it('sin incompletas no hay filas ni «más»', () => {
    const result = covered(both('a'));
    expect(result.incomplete).toEqual([]);
    expect(result.moreIncomplete).toBe(0);
  });

  it('cuenta las completas con hreflang recíproco para poder afirmarlo en la nota', () => {
    const noindex = both('n').map((page) => ({ ...page, meta: { ...page.meta, noindex: true } }));
    const pages = [...both('a'), ...both('b'), ...noindex];
    expect(covered(pages)).toMatchObject({ complete: 3, reciprocal: 2 });
  });

  it('con tres idiomas, una página en dos de ellos tiene hreflang recíproco pero no es completa', () => {
    const group = [present('en'), present('es'), missing('fr')];
    const pages = [entry('a', 'en', group), entry('a', 'es', group)];
    const result = coverage({ pages }, { ...input, locales: ['en', 'es', 'fr'] });
    expect(result).toMatchObject({ complete: 0, reciprocal: 0 });
  });

  it('las filas completas conservan sus celdas para quien las necesite (indexación)', () => {
    const pages = [...both('a'), onlyEn('b')];
    expect(covered(pages).rows).toHaveLength(2);
  });

  it('con un solo idioma no hay cobertura que enseñar', () => {
    const pages = [seoPage({ slug: 'a' })];
    expect(coverage({ pages }, { ...input, locales: ['en'] })).toBeUndefined();
  });
});
