import { describe, expect, it } from 'vitest';
import { DocsErrors } from '../errors';
import { MissingTranslation } from '../i18n/translation-policy';
import { resolveConfig } from './resolve';

/** Mensajes de error de una config inválida. */
function messages(input: unknown): string[] {
  try {
    resolveConfig(input as never);
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((problem) => problem.describe());
    throw error;
  }
  return [];
}

describe('resolveConfig: content', () => {
  it('por defecto la carpeta de contenido es `src/content/docs`', () => {
    expect(resolveConfig({ name: 'X' }).content).toBe('src/content/docs');
  });

  it('se normaliza lo declarado: `../docs/` -> `../docs`', () => {
    expect(resolveConfig({ name: 'X', content: '../docs/' }).content).toBe('../docs');
    expect(resolveConfig({ name: 'X', content: './docs//' }).content).toBe('docs');
  });

  it.each(['https://x.dev/docs', '/abs/docs', '', '.'])(
    '«%s» falla nombrando `content`',
    (value) => {
      expect(messages({ name: 'X', content: value }).join('\n')).toContain('content');
    },
  );
});

describe('resolveConfig: valores por defecto', () => {
  it('config mínima: solo nombre', () => {
    const config = resolveConfig({ name: 'Design' });
    expect(config.name).toBe('Design');
    expect(config.locales).toEqual(['en']);
    expect(config.defaultLocale).toBe('en');
    expect(config.translations.missing).toBe(MissingTranslation.LINK);
    expect(config.translations.declared).toBe(false);
    expect(config.external).toEqual([]);
    expect(config.seo.titleSuffix).toBe('Design');
    expect(config.sitemap).toEqual({ include: [] });
  });

  it('`exclude` vale una lista vacía por defecto y se conserva si se declara', () => {
    expect(resolveConfig({ name: 'X' }).exclude).toEqual([]);
    expect(resolveConfig({ name: 'X', exclude: ['drafts/'] }).exclude).toEqual(['drafts/']);
  });

  it('conserva los sitemaps que se incluyen en el índice', () => {
    const config = resolveConfig({ name: 'X', sitemap: { include: ['/lib/sitemap.xml'] } });
    expect(config.sitemap.include).toEqual(['/lib/sitemap.xml']);
  });

  it('el idioma por defecto es el primero de `locales`', () => {
    expect(resolveConfig({ name: 'X', locales: ['es', 'en'] }).defaultLocale).toBe('es');
  });

  it('respeta lo declarado', () => {
    const config = resolveConfig({
      name: 'X',
      locales: ['en', 'es'],
      defaultLocale: 'es',
      translations: { missing: 'omit' },
      seo: { titleSuffix: 'X', description: { en: 'Docs', es: 'Documentación' } },
    });
    expect(config.defaultLocale).toBe('es');
    expect(config.translations.missing).toBe('omit');
    expect(config.translations.declared).toBe(true);
    expect(config.seo.titleSuffix).toBe('X');
    expect(config.seo.description).toEqual({ en: 'Docs', es: 'Documentación' });
  });

  it('no muta la entrada', () => {
    const input = { name: 'X', locales: ['en', 'es'] };
    const before = structuredClone(input);
    resolveConfig(input);
    expect(input).toEqual(before);
  });
});

describe('resolveConfig: validación', () => {
  it('el idioma por defecto debe estar en los idiomas: nombra `defaultLocale`', () => {
    const [message] = messages({ name: 'X', locales: ['en'], defaultLocale: 'es' });
    expect(message).toContain('defaultLocale');
  });

  it('un idioma sin textos de UI en el paquete falla nombrando `locales[i]`', () => {
    expect(messages({ name: 'X', locales: ['en', 'fr'] })[0]).toContain('locales[1]');
  });

  it('valor cerrado inválido: ruta `translations.missing` y valores permitidos', () => {
    const [message] = messages({ name: 'X', translations: { missing: 'hide' } });
    expect(message).toContain('translations.missing');
    for (const allowed of ['link', 'omit', 'fallback']) expect(message).toContain(allowed);
  });

  it('el nombre es obligatorio', () => {
    expect(messages({})[0]).toContain('name');
  });

  it('una opción desconocida se rechaza nombrándola (p. ej. el `description` antiguo)', () => {
    expect(messages({ name: 'X', description: 'viejo' })[0]).toContain('description');
  });

  it('agrega todos los errores', () => {
    expect(
      messages({ description: 'x', translations: { missing: 'hide' } }).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('`gtmId` ya no exige `privacyUrl`: la integración la completa o falla según el entorno', () => {
    expect(messages({ name: 'X', gtmId: 'GTM-1' })).toEqual([]);
  });

  it('`privacyUrl` acepta una cadena o una etiqueta por idioma', () => {
    expect(messages({ name: 'X', privacyUrl: 'https://x.dev/privacy' })).toEqual([]);
    expect(
      messages({
        name: 'X',
        locales: ['en', 'es'],
        privacyUrl: { en: '/privacy/', es: '/privacidad/' },
      }),
    ).toEqual([]);
  });

  it('`privacyUrl` por idioma valida cada URL y los idiomas', () => {
    expect(messages({ name: 'X', privacyUrl: { en: 'privacy' } })[0]).toContain('privacyUrl.en');
    expect(
      messages({ name: 'X', locales: ['en'], privacyUrl: { es: '/privacidad/' } })[0],
    ).toContain('privacyUrl.es');
  });

  it('`external[].file` no puede ser una URL remota', () => {
    const [message] = messages({
      name: 'X',
      external: [{ slug: 'a', file: 'https://x.dev/a.md' }],
    });
    expect(message).toContain('external[0].file');
  });

  it('`external[].locales` solo admite idiomas del sitio', () => {
    const [message] = messages({
      name: 'X',
      locales: ['en'],
      external: [{ slug: 'a', file: 'a.md', locales: ['es'] }],
    });
    expect(message).toContain('external[0].locales[0]');
  });

  it('`external[].translations` inválido nombra `external[i].translations`', () => {
    expect(
      messages({ name: 'X', external: [{ slug: 'a', file: 'a.md', translations: 'x' }] })[0],
    ).toContain('external[0].translations');
  });
});

describe('resolveConfig: `ui`', () => {
  it('acepta overrides de claves conocidas en idiomas del sitio', () => {
    const config = resolveConfig({
      name: 'X',
      locales: ['en', 'es'],
      ui: { es: { 'search.placeholder': 'Buscar en Design' } },
    });
    expect(config.ui).toEqual({ es: { 'search.placeholder': 'Buscar en Design' } });
  });

  it('clave desconocida: ruta completa `ui.es.<clave>`', () => {
    const [message] = messages({
      name: 'X',
      locales: ['en', 'es'],
      ui: { es: { 'search.placeholdr': 'x' } },
    });
    expect(message).toContain('ui.es.search.placeholdr');
  });

  it('idioma fuera de `locales`: ruta `ui.fr`', () => {
    const [message] = messages({
      name: 'X',
      locales: ['en', 'es'],
      ui: { fr: { 'search.placeholder': 'x' } },
    });
    expect(message).toContain('ui.fr');
  });
});

describe('resolveConfig: privacidad', () => {
  it('las claves `privacy.page` y `privacy.controller` ya no existen: son opciones desconocidas', () => {
    expect(messages({ name: 'X', privacy: { page: true } })[0]).toContain('privacy');
    expect(messages({ name: 'X', privacy: { page: true } })[0]).toContain('opción desconocida');
  });

  it('privacyUrl acepta una URL o una por idioma, y rechaza un idioma que no está en `locales`', () => {
    expect(resolveConfig({ name: 'X', privacyUrl: '/privacy/' }).privacyUrl).toBe('/privacy/');
    expect(messages({ name: 'X', privacyUrl: { es: '/privacidad/' } })[0]).toContain(
      'privacyUrl.es',
    );
  });
});

describe('resolveConfig: indexes', () => {
  it('sin `indexes` no hay índices generados', () => {
    expect(resolveConfig({ name: 'X' }).indexes).toBeUndefined();
  });

  it('`indexes: {}` activa los índices con los valores por defecto', () => {
    expect(resolveConfig({ name: 'X', indexes: {} }).indexes).toEqual({
      layout: 'list',
      covers: true,
      include: 'all',
      exclude: [],
      overrides: {},
    });
  });

  it('acepta `perPageOptions` en `indexes` y en cada carpeta', () => {
    const config = resolveConfig({
      name: 'X',
      indexes: { perPageOptions: [6, 12], overrides: { a: { perPageOptions: [4] } } },
    });
    expect(config.indexes?.perPageOptions).toEqual([6, 12]);
    expect(config.indexes?.overrides.a?.perPageOptions).toEqual([4]);
  });

  it('acepta la forma completa', () => {
    const config = resolveConfig({
      name: 'X',
      locales: ['es', 'en'],
      indexes: {
        layout: 'cards',
        pageSize: 6,
        covers: false,
        include: ['tutoriales'],
        overrides: {
          tutoriales: {
            layout: 'table',
            title: { es: 'Tutoriales', en: 'Tutorials' },
            description: 'Notas.',
          },
        },
      },
    });
    expect(config.indexes?.overrides.tutoriales?.layout).toBe('table');
  });

  it.each([
    [{ layout: 'grid' }, 'indexes.layout'],
    [{ pageSize: 0 }, 'indexes.pageSize'],
    [{ pageSize: 2.5 }, 'indexes.pageSize'],
    [{ covers: 'yes' }, 'indexes.covers'],
    [{ image: false }, 'indexes.image'],
    [{ overrides: { a: { image: true } } }, 'indexes.overrides.a.image'],
    [{ include: 'todas' }, 'indexes.include'],
    [{ include: ['/tutoriales/'] }, 'indexes.include[0]'],
    [{ exclude: [''] }, 'indexes.exclude[0]'],
    [{ overrides: { a: { layaut: 'list' } } }, 'indexes.overrides.a.layaut'],
    [{ colums: 3 }, 'indexes.colums'],
    [{ perPageOptions: [] }, 'indexes.perPageOptions'],
    [{ perPageOptions: [9, 0] }, 'indexes.perPageOptions[1]'],
    [{ perPageOptions: [9.5] }, 'indexes.perPageOptions[0]'],
    [{ overrides: { a: { perPageOptions: ['9'] } } }, 'indexes.overrides.a.perPageOptions[0]'],
  ])('%j falla nombrando %s', (indexes, path) => {
    expect(messages({ name: 'X', indexes }).join('\n')).toContain(path);
  });

  it('`covers` vale en `indexes` y en cada carpeta', () => {
    const config = resolveConfig({
      name: 'X',
      indexes: { covers: false, overrides: { a: { covers: true } } },
    });
    expect(config.indexes?.covers).toBe(false);
    expect(config.indexes?.overrides.a?.covers).toBe(true);
  });

  it('`image` ya no existe en `indexes`: es una opción desconocida', () => {
    expect(messages({ name: 'X', indexes: { image: true } }).join('\n')).toContain(
      'indexes.image: opción desconocida',
    );
  });

  it('un idioma de `title` o `description` que no está en `locales` falla', () => {
    const problems = messages({
      name: 'X',
      locales: ['es'],
      indexes: { overrides: { a: { title: { fr: 'A' } } } },
    });
    expect(problems.join('\n')).toContain('indexes.overrides.a.title.fr');
  });
});
