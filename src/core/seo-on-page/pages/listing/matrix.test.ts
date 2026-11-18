import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import type { MissingTranslation } from '../../../i18n/translation-policy';
import type { SeoLocaleEntry, SeoPage } from '../../tree/types';
import { matrixRows } from './matrix';

const present = (locale: string): SeoLocaleEntry => ({
  locale,
  status: 'present',
  url: `/${locale}/`,
});
const missing = (locale: string, policy: MissingTranslation): SeoLocaleEntry => ({
  locale,
  status: 'missing',
  policy,
  declared: true,
});

/** Una entrada cuyo grupo tiene estos idiomas, en el orden de la config. */
const entry = (
  slug: string,
  locale: string,
  locales: SeoLocaleEntry[],
  extra: Partial<SeoPage> = {},
) => seoPage({ slug, locale, locales, ...extra });

const matrix = (entries: SeoPage[], locales = ['en', 'es']) =>
  matrixRows(entries, {
    locales,
    defaultLocale: 'en',
    inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  });

const full = [present('en'), present('es')];

describe('matrixRows', () => {
  it('una fila por página y una celda por idioma configurado, en el orden de la config', () => {
    const { rows } = matrix([entry('a', 'en', full), entry('a', 'es', full)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells.map(({ locale, state }) => [locale, state])).toEqual([
      ['en', 'exists'],
      ['es', 'exists'],
    ]);
  });

  it('el idioma ausente depende de su política: enlace = falta, respaldo = respaldo, omitir = omitida', () => {
    const states = (policy: MissingTranslation) =>
      matrix([entry('a', 'en', [present('en'), missing('es', policy)])]).rows[0]?.cells[1]?.state;
    expect(states('link')).toBe('missing');
    expect(states('fallback')).toBe('fallback');
    expect(states('omit')).toBe('omitted');
  });

  it('hreflang es recíproco si hay al menos dos versiones indexables', () => {
    const { rows } = matrix([entry('a', 'en', full)]);
    expect(rows[0]?.hreflang).toBe('reciprocal');
  });

  it('con una sola versión no hay con quién emparejar: «sin par»', () => {
    const { rows } = matrix([entry('a', 'en', [present('en'), missing('es', 'link')])]);
    expect(rows[0]?.hreflang).toBe('unpaired');
  });

  it('una página noindex no emite hreflang ni x-default', () => {
    const { rows } = matrix([
      entry('a', 'en', full, { meta: { ...seoPage().meta, noindex: true } }),
    ]);
    expect(rows[0]).toMatchObject({ hreflang: 'omitted', xDefault: undefined });
  });

  it('x-default es el idioma por defecto cuando existe y hay hreflang', () => {
    expect(matrix([entry('a', 'en', full)]).rows[0]?.xDefault).toBe('en');
    const onlyEs = matrix([entry('a', 'es', [missing('en', 'link'), present('es')])]);
    expect(onlyEs.rows[0]?.xDefault).toBeUndefined();
    // Dos versiones indexables (hay hreflang) pero ninguna es la de por defecto: no hay a quién apuntar.
    const noDefault = matrix(
      [entry('a', 'es', [missing('en', 'link'), present('es'), present('fr')])],
      ['en', 'es', 'fr'],
    );
    expect(noDefault.rows[0]).toMatchObject({ hreflang: 'reciprocal', xDefault: undefined });
  });

  it('con un solo idioma configurado no hay hreflang que mostrar', () => {
    expect(matrix([entry('a', 'en', [present('en')])], ['en']).hreflang).toBe(false);
    expect(matrix([entry('a', 'en', full)]).hreflang).toBe(true);
  });

  it('cuenta las páginas completas: todos los idiomas existen', () => {
    const { complete } = matrix([
      entry('a', 'en', full),
      entry('b', 'en', [present('en'), missing('es', 'link')]),
      entry('c', 'en', [present('en'), missing('es', 'omit')]),
    ]);
    expect(complete).toBe(1);
  });

  it('las incompletas van primero y el resto conserva su orden', () => {
    const { rows } = matrix([
      entry('a', 'en', full),
      entry('b', 'en', [present('en'), missing('es', 'link')]),
      entry('c', 'en', full),
    ]);
    expect(rows.map(({ slug }) => slug)).toEqual(['b', 'a', 'c']);
  });

  it('enlaza al inspector del idioma por defecto o, sin él, al primero que existe', () => {
    const { rows } = matrix([
      entry('a', 'en', full),
      entry('a', 'es', full),
      entry('b', 'es', [missing('en', 'link'), present('es')]),
    ]);
    expect(rows.find(({ slug }) => slug === 'a')?.href).toBe('/i/?slug=a&locale=en');
    expect(rows.find(({ slug }) => slug === 'b')?.href).toBe('/i/?slug=b&locale=es');
  });

  it('lleva las etiquetas de la página', () => {
    const { rows } = matrix([entry('', 'en', full), entry('', 'es', full)]);
    expect(rows[0]?.tags).toEqual([{ kind: 'home' }]);
  });
});
