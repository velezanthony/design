import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../config/resolve';
import { DocsErrors } from '../errors';
import { discoverPages, externalPath, type SourceFile } from './discovery';

function cfg(extra: object = {}) {
  return resolveConfig({ name: 'X', locales: ['en', 'es'], ...extra });
}
function native(path: string, body = `# ${path}`, frontmatter?: SourceFile['frontmatter']) {
  return { kind: 'native', path, body, frontmatter } satisfies SourceFile;
}
function external(path: string, body = `# ${path}`) {
  return { kind: 'external', path, body } satisfies SourceFile;
}

function errorsOf(run: () => unknown): string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((problem) => problem.describe());
    throw error;
  }
  return [];
}

describe('discoverPages: nativas', () => {
  it('un archivo es una página en el idioma por defecto', () => {
    const [page, ...rest] = discoverPages([native('guide/install.md')], cfg());
    expect(rest).toEqual([]);
    expect(page).toMatchObject({
      slug: 'guide/install',
      locale: 'en',
      kind: 'native',
      sourcePath: 'guide/install.md',
      title: 'guide/install.md',
    });
  });

  it('el sufijo de idioma da otra página del mismo grupo', () => {
    const pages = discoverPages([native('guide/install.md'), native('guide/install.es.md')], cfg());
    expect(pages.map((page) => [page.slug, page.locale])).toEqual([
      ['guide/install', 'en'],
      ['guide/install', 'es'],
    ]);
  });

  it('index colapsa a su directorio y el de la raíz es el slug vacío', () => {
    const pages = discoverPages([native('guide/index.md'), native('index.md')], cfg());
    expect(pages.map((page) => page.slug)).toEqual(['guide', '']);
  });

  it('el frontmatter se respeta: título, orden, seo y política de traducción', () => {
    const [page] = discoverPages(
      [
        native('a.md', 'sin h1', {
          title: 'Título del frontmatter',
          order: 3,
          seo: { noindex: true },
          translations: 'omit',
        }),
      ],
      cfg(),
    );
    expect(page).toMatchObject({
      title: 'Título del frontmatter',
      order: 3,
      seo: { noindex: true },
      translations: 'omit',
    });
  });

  it('sufijo de idioma no configurado: falla nombrando el archivo', () => {
    const errors = errorsOf(() => discoverPages([native('install.fr.md')], cfg()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('install.fr.md');
  });

  it('colisión de slugs: falla nombrando ambos archivos', () => {
    const errors = errorsOf(() => discoverPages([native('a.md'), native('a/index.md')], cfg()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('a.md');
    expect(errors[0]).toContain('a/index.md');
  });

  /* `es.md` en el idioma por defecto sería `/es/`, la portada del idioma `es`. */
  it('un slug que es un código de idioma configurado colisiona con la portada de ese idioma', () => {
    const errors = errorsOf(() => discoverPages([native('es.md')], cfg()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('es.md');
    expect(errors[0]).toContain('«es»');
    expect(errors[0]).toContain('/es/');
  });

  it('también cuando el código es el primer segmento del slug (`es/guia.md`)', () => {
    const errors = errorsOf(() => discoverPages([native('es/guia.md')], cfg()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('es/guia.md');
  });

  it('afecta a las páginas externas del idioma por defecto', () => {
    const errors = errorsOf(() =>
      discoverPages([external('../X.md')], cfg({ external: [{ slug: 'es', file: '../X.md' }] })),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('«es»');
  });

  it('el idioma por defecto no ocupa prefijo: `en.md` es una página normal', () => {
    expect(discoverPages([native('en.md')], cfg()).map((page) => page.slug)).toEqual(['en']);
  });

  it('un slug parecido (`esperanza.md`, `espanol/x.md`) no colisiona', () => {
    const slugs = discoverPages([native('esperanza.md'), native('espanol/x.md')], cfg()).map(
      (page) => page.slug,
    );
    expect(slugs).toEqual(['esperanza', 'espanol/x']);
  });

  it('un sitio monolingüe no tiene prefijos que reservar', () => {
    const mono = resolveConfig({ name: 'X' });
    expect(discoverPages([native('es.md')], mono).map((page) => page.slug)).toEqual(['es']);
  });

  it('sin H1 ni título: falla nombrando el archivo', () => {
    const errors = errorsOf(() => discoverPages([native('vacia.md', 'solo texto')], cfg()));
    expect(errors[0]).toContain('vacia.md');
  });

  it('agrega TODOS los errores en un único throw', () => {
    const errors = errorsOf(() =>
      discoverPages(
        [native('x.fr.md'), native('vacia.md', 'texto'), native('a.md'), native('a/index.md')],
        cfg(),
      ),
    );
    expect(errors).toHaveLength(3);
  });
});

describe('discoverPages: externas', () => {
  const entry = { slug: 'changelog', file: '../CHANGELOG.md' };

  it('un archivo raíz se publica sin frontmatter', () => {
    const pages = discoverPages(
      [external('../CHANGELOG.md', '# Changelog')],
      cfg({ locales: ['en'], external: [entry] }),
    );
    expect(pages).toEqual([
      expect.objectContaining({
        slug: 'changelog',
        locale: 'en',
        kind: 'external',
        title: 'Changelog',
        sourcePath: '../CHANGELOG.md',
      }),
    ]);
  });

  it('detecta el hermano `.es.md` cuando se omiten los idiomas', () => {
    const pages = discoverPages(
      [external('../CHANGELOG.md'), external('../CHANGELOG.es.md')],
      cfg({ external: [entry] }),
    );
    expect(pages.map((page) => page.locale)).toEqual(['en', 'es']);
  });

  it('sin hermano, queda solo el idioma por defecto', () => {
    const pages = discoverPages([external('../CHANGELOG.md')], cfg({ external: [entry] }));
    expect(pages.map((page) => page.locale)).toEqual(['en']);
  });

  it('mandan los idiomas declarados: el hermano no declarado se ignora', () => {
    const pages = discoverPages(
      [external('../CHANGELOG.md'), external('../CHANGELOG.es.md')],
      cfg({ external: [{ ...entry, locales: ['en'] }] }),
    );
    expect(pages.map((page) => page.locale)).toEqual(['en']);
  });

  it('archivo ausente (el base): falla nombrando slug y ruta', () => {
    const errors = errorsOf(() => discoverPages([], cfg({ external: [entry] })));
    expect(errors[0]).toContain('changelog');
    expect(errors[0]).toContain('../CHANGELOG.md');
  });

  it('archivo ausente de un idioma declarado: falla nombrando slug y ruta', () => {
    const errors = errorsOf(() =>
      discoverPages(
        [external('../CHANGELOG.md')],
        cfg({ external: [{ ...entry, locales: ['en', 'es'] }] }),
      ),
    );
    expect(errors[0]).toContain('changelog');
    expect(errors[0]).toContain('../CHANGELOG.es.md');
  });

  it('`./x.md` y `x.md` son el mismo archivo', () => {
    const pages = discoverPages(
      [external('x.md', '# X')],
      cfg({ locales: ['en'], external: [{ slug: 'x', file: './x.md' }] }),
    );
    expect(pages).toHaveLength(1);
  });

  it('seo y translations de la entrada llegan a todos los idiomas', () => {
    const pages = discoverPages(
      [external('../CHANGELOG.md'), external('../CHANGELOG.es.md')],
      cfg({ external: [{ ...entry, seo: { noindex: true }, translations: 'omit' }] }),
    );
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(page.seo).toEqual({ noindex: true });
      expect(page.translations).toBe('omit');
    }
  });

  it('un slug externo igual a uno nativo del mismo idioma falla', () => {
    const errors = errorsOf(() =>
      discoverPages(
        [native('changelog.md'), external('../CHANGELOG.md')],
        cfg({ locales: ['en'], external: [entry] }),
      ),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('changelog.md');
    expect(errors[0]).toContain('../CHANGELOG.md');
  });

  it('el mismo slug en otro idioma no choca', () => {
    const pages = discoverPages(
      [native('changelog.es.md'), external('../CHANGELOG.md')],
      cfg({ external: [entry] }),
    );
    expect(pages.map((page) => [page.slug, page.locale])).toEqual([
      ['changelog', 'es'],
      ['changelog', 'en'],
    ]);
  });
});

describe('externalPath', () => {
  it('el idioma por defecto es el archivo tal cual; los demás llevan sufijo', () => {
    expect(externalPath('../CHANGELOG.md', 'en', 'en')).toBe('../CHANGELOG.md');
    expect(externalPath('../CHANGELOG.md', 'es', 'en')).toBe('../CHANGELOG.es.md');
    expect(externalPath('./docs/x.md', 'es', 'es')).toBe('docs/x.md');
  });
});
