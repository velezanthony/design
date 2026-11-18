import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage } from '../../tree/types';
import { localeTone, pageRows } from './rows';

const issue = (kind: IssueKind, severity: IssueSeverity): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: kind,
});
const warn = (kind: IssueKind = IssueKind.DUPLICATE_TITLE) => issue(kind, IssueSeverity.WARNING);
const info = (kind: IssueKind = IssueKind.DESCRIPTION_INHERITED) => issue(kind, IssueSeverity.INFO);

const entry = (slug: string, locale: string, extra: Partial<SeoPage> = {}) =>
  seoPage({ slug, locale, ...extra });

const rows = (entries: SeoPage[], common: IssueKind[] = []) =>
  pageRows(entries, {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    common,
    inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  });

describe('pageRows', () => {
  it('los problemas de la fila respetan las gravedades que se están viendo', () => {
    const [row] = pageRows(
      [entry('a', 'en', { issues: [warn(), info(IssueKind.TRANSLATION_MISSING)] })],
      {
        locales: ['en'],
        defaultLocale: 'en',
        common: [],
        severities: [IssueSeverity.ERROR, IssueSeverity.WARNING],
        inspector: () => '',
      },
    );
    expect(row?.issues.map((issue) => issue.kind)).toEqual([IssueKind.DUPLICATE_TITLE]);
  });

  it('agrupa por slug: una fila por página aunque tenga varios idiomas', () => {
    const result = rows([entry('a', 'en'), entry('a', 'es'), entry('b', 'en')]);
    expect(result.map((row) => row.slug)).toEqual(['a', 'b']);
  });

  it('una insignia por idioma configurado, con la peor gravedad de ese idioma', () => {
    const [row] = rows([
      entry('a', 'en', { issues: [info(), warn()] }),
      entry('a', 'es', { issues: [info()] }),
    ]);
    expect(row?.locales.map(({ locale, tone }) => [locale, tone])).toEqual([
      ['en', 'warning'],
      ['es', 'info'],
    ]);
  });

  it('un idioma sin incidencias es «ok» y uno que no existe, «missing»', () => {
    const [row] = rows([entry('a', 'en')]);
    expect(row?.locales.map(({ tone }) => tone)).toEqual(['ok', 'missing']);
    expect(row?.locales[1]).toMatchObject({ locale: 'es', present: false });
  });

  it('enlaza la página y cada idioma al inspector; la página, al idioma por defecto', () => {
    const [row] = rows([entry('a', 'es'), entry('a', 'en')]);
    expect(row?.href).toBe('/i/?slug=a&locale=en');
    expect(row?.locales[1]).toMatchObject({ href: '/i/?slug=a&locale=es' });
  });

  it('sin el idioma por defecto, la página usa el primero que exista', () => {
    const [row] = rows([entry('a', 'es', { meta: { ...seoPage().meta, title: 'Hola | Site' } })]);
    expect(row).toMatchObject({ href: '/i/?slug=a&locale=es', title: 'Hola | Site' });
  });

  it('la entrada principal es la del idioma por defecto aunque no sea la primera configurada', () => {
    const [row] = pageRows([entry('a', 'en'), entry('a', 'es')], {
      locales: ['en', 'es'],
      defaultLocale: 'es',
      common: [],
      inspector: ({ locale }) => locale,
    });
    expect(row?.href).toBe('es');
  });

  it('título y longitud del título son los del idioma por defecto', () => {
    const [row] = rows([
      entry('a', 'es', { meta: { ...seoPage().meta, titleLength: 30 } }),
      entry('a', 'en', { meta: { ...seoPage().meta, title: 'Guide | Site', titleLength: 12 } }),
    ]);
    expect(row).toMatchObject({ title: 'Guide | Site', titleLength: 12 });
  });

  it('cada problema sale una vez, con los idiomas donde ocurre', () => {
    const [row] = rows([
      entry('a', 'en', { issues: [warn()] }),
      entry('a', 'es', { issues: [warn()] }),
    ]);
    expect(row?.issues).toEqual([
      {
        kind: IssueKind.DUPLICATE_TITLE,
        severity: 'warning',
        locales: ['en', 'es'],
        issue: expect.objectContaining({ kind: IssueKind.DUPLICATE_TITLE }),
      },
    ]);
  });

  it('los idiomas de un problema salen en el orden de la config, no en el de entrada', () => {
    const [row] = rows([
      entry('a', 'es', { issues: [warn()] }),
      entry('a', 'en', { issues: [warn()] }),
    ]);
    expect(row?.issues[0]?.locales).toEqual(['en', 'es']);
  });

  it('la medida del problema solo se enseña si es la misma en todos los idiomas', () => {
    const measured = (value: number) => ({ ...warn(IssueKind.TITLE_TOO_SHORT), value, limit: 15 });
    const same = rows([
      entry('a', 'en', { issues: [measured(8)] }),
      entry('a', 'es', { issues: [measured(8)] }),
    ]);
    expect(same[0]?.issues[0]?.issue).toMatchObject({ value: 8, limit: 15 });
    const different = rows([
      entry('a', 'en', { issues: [measured(8)] }),
      entry('a', 'es', { issues: [measured(9)] }),
    ]);
    expect(different[0]?.issues[0]?.issue).not.toHaveProperty('value');
    expect(different[0]?.issues[0]?.issue).not.toHaveProperty('limit');
  });

  it('la gravedad de un problema en varios idiomas es la peor de ellas', () => {
    const [row] = rows([
      entry('a', 'en', { issues: [info(IssueKind.DUPLICATE_TITLE)] }),
      entry('a', 'es', { issues: [warn(IssueKind.DUPLICATE_TITLE)] }),
    ]);
    expect(row?.issues[0]).toMatchObject({ severity: 'warning', locales: ['en', 'es'] });
  });

  it('los problemas comunes se quitan de la fila pero siguen tiñendo la insignia', () => {
    const [row] = rows([entry('a', 'en', { issues: [info()] })], [IssueKind.DESCRIPTION_INHERITED]);
    expect(row?.issues).toEqual([]);
    expect(row?.locales[0]?.tone).toBe('info');
    expect(row?.severity).toBe('info');
  });

  it('dentro de la fila los problemas van del más grave al menos', () => {
    const [row] = rows([entry('a', 'en', { issues: [info(), warn()] })]);
    expect(row?.issues.map(({ severity }) => severity)).toEqual(['warning', 'info']);
  });

  it('el detalle de un idioma lleva sus problemas propios, sin los comunes', () => {
    const [row] = rows(
      [entry('a', 'en', { issues: [info(), warn()] })],
      [IssueKind.DESCRIPTION_INHERITED],
    );
    const detail = row?.locales[0];
    expect(detail?.present && detail.issues.map(({ kind }) => kind)).toEqual([
      IssueKind.DUPLICATE_TITLE,
    ]);
  });

  it('ordena por gravedad, la peor primero, y conserva el orden del árbol en los empates', () => {
    const result = rows([
      entry('a', 'en'),
      entry('b', 'en', { issues: [info()] }),
      entry('c', 'en', { issues: [warn()] }),
      entry('d', 'en', { issues: [issue(IssueKind.NO_H1, IssueSeverity.ERROR)] }),
      entry('e', 'en', { issues: [warn()] }),
    ]);
    expect(result.map((row) => row.slug)).toEqual(['d', 'c', 'e', 'b', 'a']);
  });

  it('una página sin ningún problema no tiene gravedad', () => {
    expect(rows([entry('a', 'en')])[0]?.severity).toBeUndefined();
  });

  describe('etiquetas', () => {
    it('la portada', () => {
      expect(rows([entry('', 'en'), entry('', 'es')])[0]?.tags).toEqual([{ kind: 'home' }]);
    });

    it('«Solo EN» cuando existe en un único idioma de varios configurados', () => {
      expect(rows([entry('a', 'en')])[0]?.tags).toEqual([{ kind: 'only', locale: 'en' }]);
    });

    it('externa y noindex salen de los datos de la página', () => {
      const tags = rows([
        entry('a', 'en', { kind: 'external', meta: { ...seoPage().meta, noindex: true } }),
        entry('a', 'es'),
      ])[0]?.tags;
      expect(tags).toEqual([{ kind: 'external' }, { kind: 'noindex' }]);
    });

    it('«Respaldo ES» cuando un idioma se sirve con el texto de otro, en vez de «Solo EN»', () => {
      const fallback = entry('a', 'en', {
        locales: [
          { locale: 'en', status: 'present', url: '/a/' },
          { locale: 'es', status: 'missing', policy: 'fallback', declared: false },
        ],
      });
      expect(rows([fallback])[0]?.tags).toEqual([{ kind: 'fallback', locales: ['es'] }]);
    });

    it('un idioma que falta sin respaldo sigue siendo «Solo»', () => {
      const missing = entry('a', 'en', {
        locales: [
          { locale: 'en', status: 'present', url: '/a/' },
          { locale: 'es', status: 'missing', policy: 'link', declared: false },
        ],
      });
      expect(rows([missing])[0]?.tags).toEqual([{ kind: 'only', locale: 'en' }]);
    });

    it('una página del sitio que sustituye a una de la librería lo dice', () => {
      const tags = rows([entry('', 'en', { kind: 'client', replaces: true })])[0]?.tags;
      expect(tags).toContainEqual({ kind: 'replaces' });
    });

    it('una página que el sitio añade en src/pages/ lleva su etiqueta', () => {
      const tags = rows([
        entry('a', 'en', { kind: 'client' }),
        entry('a', 'es', { kind: 'client' }),
      ])[0]?.tags;
      expect(tags).toEqual([{ kind: 'client' }]);
    });

    it('con un solo idioma configurado, existir en uno solo no es «Solo»', () => {
      const [row] = pageRows([entry('a', 'en')], {
        locales: ['en'],
        defaultLocale: 'en',
        common: [],
        inspector: () => '',
      });
      expect(row?.tags).toEqual([]);
    });

    it('una página completa y corriente no lleva etiquetas', () => {
      expect(rows([entry('a', 'en'), entry('a', 'es')])[0]?.tags).toEqual([]);
    });
  });
});

describe('localeTone', () => {
  it('sin página es «missing»', () => {
    expect(localeTone(undefined)).toBe('missing');
  });

  it('sin incidencias es «ok»', () => {
    expect(localeTone(entry('a', 'en'))).toBe('ok');
  });

  it('con incidencias es la peor gravedad', () => {
    expect(localeTone(entry('a', 'en', { issues: [info(), warn()] }))).toBe('warning');
  });
});
