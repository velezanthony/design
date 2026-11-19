import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import { DocsErrors } from '../errors';
import type { UrlPolicy } from './availability';
import {
  fallbackRoutes,
  MissingTranslation,
  resolvePolicies,
  sourceLocale,
  undeclaredMissing,
} from './translation-policy';

function page(
  slug: string,
  locale: string,
  translations?: MissingTranslation,
  sourcePath = `${slug}${locale === 'en' ? '' : `.${locale}`}.md`,
): Page {
  return {
    slug,
    locale,
    title: slug,
    kind: 'native',
    body: '',
    sourcePath,
    ...(translations ? { translations } : {}),
  };
}

describe('MissingTranslation', () => {
  it('es un objeto as const con los tres valores del YAML', () => {
    expect(MissingTranslation).toEqual({ LINK: 'link', OMIT: 'omit', FALLBACK: 'fallback' });
  });
});

describe('resolvePolicies', () => {
  it('sin política declarada aplica la base', () => {
    const { policies, errors } = resolvePolicies([page('a', 'en')], MissingTranslation.LINK);
    expect(errors).toEqual([]);
    expect(policies.get('a')).toBe('link');
  });

  it('la de la página gana a la base', () => {
    const { policies } = resolvePolicies([page('a', 'en', 'omit')], MissingTranslation.LINK);
    expect(policies.get('a')).toBe('omit');
  });

  it('basta que UNO del grupo la declare: vale para todo el grupo', () => {
    const { policies } = resolvePolicies(
      [page('a', 'en'), page('a', 'es', 'fallback')],
      MissingTranslation.LINK,
    );
    expect(policies.get('a')).toBe('fallback');
  });

  it('valores iguales en el grupo no son conflicto', () => {
    const { errors } = resolvePolicies(
      [page('a', 'en', 'omit'), page('a', 'es', 'omit')],
      MissingTranslation.LINK,
    );
    expect(errors).toEqual([]);
  });

  it('conflicto en el grupo: error con ambos archivos', () => {
    const { errors } = resolvePolicies(
      [page('install', 'en', 'link'), page('install', 'es', 'fallback')],
      MissingTranslation.OMIT,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('install.md');
    expect(errors[0]?.message).toContain('install.es.md');
  });

  it('el conflicto de la portada la nombra como «(portada)» y lleva pista y archivo', () => {
    const { errors } = resolvePolicies(
      [page('', 'en', 'link'), page('', 'es', 'omit')],
      MissingTranslation.OMIT,
    );
    expect(errors[0]?.message).toContain('«(portada)»');
    expect(errors[0]?.file).toBe('.md');
    expect(errors[0]?.hint).toBeTruthy();
  });

  it('un grupo con conflicto no impide resolver los demás', () => {
    const { policies, errors } = resolvePolicies(
      [page('a', 'en', 'link'), page('a', 'es', 'omit'), page('b', 'en', 'fallback')],
      MissingTranslation.LINK,
    );
    expect(errors).toHaveLength(1);
    expect(policies.get('b')).toBe('fallback');
  });
});

describe('sourceLocale', () => {
  const available = { en: '/a/', es: '/es/a/' };

  it('es el idioma por defecto si el grupo lo tiene', () => {
    expect(sourceLocale(available, ['en', 'es'], 'en')).toBe('en');
    expect(sourceLocale(available, ['en', 'es'], 'es')).toBe('es');
  });

  it('si no, el primero de `locales` que exista en el grupo', () => {
    expect(sourceLocale({ es: '/es/a/' }, ['en', 'es'], 'en')).toBe('es');
    expect(sourceLocale({ fr: '/fr/a/', es: '/es/a/' }, ['en', 'es', 'fr'], 'en')).toBe('es');
  });
});

describe('undeclaredMissing', () => {
  const locales = ['en', 'es'];

  it('grupo incompleto sin política declarada: slug y idiomas que faltan', () => {
    expect(undeclaredMissing([page('install', 'en')], locales)).toEqual([
      { slug: 'install', missing: ['es'] },
    ]);
  });

  it('declarada (aunque coincida con la base) no avisa', () => {
    expect(undeclaredMissing([page('install', 'en', 'link')], locales)).toEqual([]);
  });

  it('basta que un archivo del grupo la declare', () => {
    expect(
      undeclaredMissing([page('i', 'en'), page('i', 'es', 'link')], ['en', 'es', 'fr']),
    ).toEqual([]);
  });

  it('grupo completo no avisa', () => {
    expect(undeclaredMissing([page('i', 'en'), page('i', 'es')], locales)).toEqual([]);
  });

  it('sitio monolingüe nunca avisa', () => {
    expect(undeclaredMissing([page('i', 'en')], ['en'])).toEqual([]);
  });

  it('varios grupos y varios idiomas ausentes, en orden', () => {
    expect(
      undeclaredMissing(
        [page('a', 'en'), page('b', 'es'), page('c', 'en'), page('c', 'es')],
        ['en', 'es', 'fr'],
      ),
    ).toEqual([
      { slug: 'a', missing: ['es', 'fr'] },
      { slug: 'b', missing: ['en', 'fr'] },
      { slug: 'c', missing: ['fr'] },
    ]);
  });
});

describe('DocsErrors se usa con resolvePolicies', () => {
  it('los errores son DocsError agregables', () => {
    const { errors } = resolvePolicies(
      [page('x', 'en', 'link'), page('x', 'es', 'omit')],
      MissingTranslation.LINK,
    );
    expect(() => {
      throw new DocsErrors(errors);
    }).toThrow(/x\.md/);
  });
});

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };
const config = { locales: ['en', 'es'], defaultLocale: 'en' };

describe('fallbackRoutes', () => {
  const availability = new Map([
    ['changelog', { en: '/repo/changelog/' }],
    ['install', { en: '/repo/install/', es: '/repo/es/install/' }],
    ['faq', { en: '/repo/faq/' }],
  ]);

  it('una ruta por idioma ausente, solo en grupos fallback', () => {
    const policies = new Map<string, MissingTranslation>([
      ['changelog', 'fallback'],
      ['install', 'fallback'],
      ['faq', 'link'],
    ]);
    expect(fallbackRoutes(availability, policies, config, url)).toEqual([
      {
        slug: 'changelog',
        locale: 'es',
        isFallback: true,
        entryMeta: { locale: 'en' },
        canonical: '/repo/changelog/',
      },
    ]);
  });

  it('un grupo completo no genera rutas y link/omit tampoco', () => {
    const policies = new Map<string, MissingTranslation>([
      ['changelog', 'omit'],
      ['install', 'fallback'],
      ['faq', 'link'],
    ]);
    expect(fallbackRoutes(availability, policies, config, url)).toEqual([]);
  });

  it('no cambia Availability: las rutas de reserva no son traducciones', () => {
    const before = structuredClone([...availability]);
    fallbackRoutes(availability, new Map([['changelog', 'fallback']]), config, url);
    expect([...availability]).toEqual(before);
  });

  it('con tres idiomas genera una ruta por cada idioma ausente', () => {
    const three = { locales: ['en', 'es', 'fr'], defaultLocale: 'en' };
    const routes = fallbackRoutes(
      new Map([['a', { en: '/repo/a/' }]]),
      new Map([['a', 'fallback']]),
      three,
      url,
    );
    expect(routes.map((route) => route.locale)).toEqual(['es', 'fr']);
  });
});
