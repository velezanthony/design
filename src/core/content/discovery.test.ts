import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../config/resolve';
import { DocsErrors } from '../errors';
import { discoverPages, ignoredListings, externalPath, type SourceFile } from './discovery';

function config(extra: object = {}) {
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
    const [page, ...rest] = discoverPages([native('guide/install.md')], config());
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
    const pages = discoverPages(
      [native('guide/install.md'), native('guide/install.es.md')],
      config(),
    );
    expect(pages.map((page) => [page.slug, page.locale])).toEqual([
      ['guide/install', 'en'],
      ['guide/install', 'es'],
    ]);
  });

  it('index colapsa a su directorio y el de la raíz es el slug vacío', () => {
    const pages = discoverPages([native('guide/index.md'), native('index.md')], config());
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
      config(),
    );
    expect(page).toMatchObject({
      title: 'Título del frontmatter',
      order: 3,
      seo: { noindex: true },
      translations: 'omit',
    });
  });

  it('sufijo de idioma no configurado: falla nombrando el archivo', () => {
    const errors = errorsOf(() => discoverPages([native('install.fr.md')], config()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('install.fr.md');
  });

  it('colisión de slugs: falla nombrando ambos archivos', () => {
    const errors = errorsOf(() => discoverPages([native('a.md'), native('a/index.md')], config()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('a.md');
    expect(errors[0]).toContain('a/index.md');
  });

  /* `es.md` en el idioma por defecto sería `/es/`, la portada del idioma `es`. */
  it('un slug que es un código de idioma configurado colisiona con la portada de ese idioma', () => {
    const errors = errorsOf(() => discoverPages([native('es.md')], config()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('es.md');
    expect(errors[0]).toContain('«es»');
    expect(errors[0]).toContain('/es/');
  });

  it('también cuando el código es el primer segmento del slug (`es/guia.md`)', () => {
    const errors = errorsOf(() => discoverPages([native('es/guia.md')], config()));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('es/guia.md');
  });

  it('afecta a las páginas externas del idioma por defecto', () => {
    const errors = errorsOf(() =>
      discoverPages([external('../X.md')], config({ external: [{ slug: 'es', file: '../X.md' }] })),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('«es»');
  });

  it('el idioma por defecto no ocupa prefijo: `en.md` es una página normal', () => {
    expect(discoverPages([native('en.md')], config()).map((page) => page.slug)).toEqual(['en']);
  });

  it('un slug parecido (`esperanza.md`, `espanol/x.md`) no colisiona', () => {
    const slugs = discoverPages([native('esperanza.md'), native('espanol/x.md')], config()).map(
      (page) => page.slug,
    );
    expect(slugs).toEqual(['esperanza', 'espanol/x']);
  });

  it('el prefijo solo se reserva al idioma por defecto: `es/guia.es.md` es una página de `es`', () => {
    const [page] = discoverPages([native('es/guia.es.md')], config());
    expect(page).toMatchObject({ slug: 'es/guia', locale: 'es' });
  });

  it('el error de prefijo reservado explica cómo renombrar', () => {
    expect(errorsOf(() => discoverPages([native('es.md')], config()))[0]).toContain('Renombra');
  });

  it('un archivo nativo no cuenta como el external declarado aunque comparta ruta', () => {
    const errors = errorsOf(() =>
      discoverPages([native('x.md')], config({ external: [{ slug: 'y', file: 'x.md' }] })),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Falta el archivo externo');
    expect(errors[0]).toContain('external[].file');
  });

  it('un sitio monolingüe no tiene prefijos que reservar', () => {
    const mono = resolveConfig({ name: 'X' });
    expect(discoverPages([native('es.md')], mono).map((page) => page.slug)).toEqual(['es']);
  });

  it('sin H1 ni título: falla nombrando el archivo', () => {
    const errors = errorsOf(() => discoverPages([native('vacia.md', 'solo texto')], config()));
    expect(errors[0]).toContain('vacia.md');
  });

  it('agrega TODOS los errores en un único throw', () => {
    const errors = errorsOf(() =>
      discoverPages(
        [native('x.fr.md'), native('vacia.md', 'texto'), native('a.md'), native('a/index.md')],
        config(),
      ),
    );
    expect(errors).toHaveLength(3);
  });
});

describe('discoverPages: README como portada', () => {
  it('README.md sin index.md hace de portada', () => {
    const pages = discoverPages([native('README.md')], config());
    expect(pages.map((page) => page.slug)).toEqual(['']);
  });

  it('también en una carpeta: guide/README.md es `guide`', () => {
    const pages = discoverPages([native('guide/README.md'), native('guide/a.md')], config());
    expect(pages.map((page) => page.slug)).toEqual(['guide', 'guide/a']);
  });

  it('cada idioma decide por su cuenta: index.md en en, README.es.md en es', () => {
    const pages = discoverPages([native('index.md'), native('README.es.md')], config());
    expect(pages.map((page) => [page.slug, page.locale])).toEqual([
      ['', 'en'],
      ['', 'es'],
    ]);
  });

  it('con index.md en la misma carpeta e idioma, README.md es una página más', () => {
    const pages = discoverPages([native('index.md'), native('README.md')], config());
    expect(pages.map((page) => page.slug)).toEqual(['', 'README']);
  });
});

describe('discoverPages: portada externa', () => {
  it('`slug: index` hace de portada un archivo de fuera (un README de la raíz)', () => {
    const pages = discoverPages(
      [external('../README.md')],
      config({ external: [{ slug: 'index', file: '../README.md' }] }),
    );
    expect(pages.map((page) => [page.slug, page.kind])).toEqual([['', 'external']]);
  });

  it('`guide/index` colapsa a `guide`, igual que un index.md nativo', () => {
    const pages = discoverPages(
      [external('x.md')],
      config({ external: [{ slug: 'guide/index', file: 'x.md' }] }),
    );
    expect(pages.map((page) => page.slug)).toEqual(['guide']);
  });

  it('choca con un index.md nativo nombrando ambos archivos', () => {
    const problems = errorsOf(() =>
      discoverPages(
        [native('index.md'), external('../README.md')],
        config({ external: [{ slug: 'index', file: '../README.md' }] }),
      ),
    );
    expect(problems.join('\n')).toContain('index.md');
    expect(problems.join('\n')).toContain('../README.md');
  });
});

describe('discoverPages: externas', () => {
  const entry = { slug: 'changelog', file: '../CHANGELOG.md' };

  it('un archivo raíz se publica sin frontmatter', () => {
    const pages = discoverPages(
      [external('../CHANGELOG.md', '# Changelog')],
      config({ locales: ['en'], external: [entry] }),
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
      config({ external: [entry] }),
    );
    expect(pages.map((page) => page.locale)).toEqual(['en', 'es']);
  });

  it('sin hermano, queda solo el idioma por defecto', () => {
    const pages = discoverPages([external('../CHANGELOG.md')], config({ external: [entry] }));
    expect(pages.map((page) => page.locale)).toEqual(['en']);
  });

  it('mandan los idiomas declarados: el hermano no declarado se ignora', () => {
    const pages = discoverPages(
      [external('../CHANGELOG.md'), external('../CHANGELOG.es.md')],
      config({ external: [{ ...entry, locales: ['en'] }] }),
    );
    expect(pages.map((page) => page.locale)).toEqual(['en']);
  });

  it('archivo ausente (el base): falla nombrando slug y ruta', () => {
    const errors = errorsOf(() => discoverPages([], config({ external: [entry] })));
    expect(errors[0]).toContain('changelog');
    expect(errors[0]).toContain('../CHANGELOG.md');
  });

  it('archivo ausente de un idioma declarado: falla nombrando slug y ruta', () => {
    const errors = errorsOf(() =>
      discoverPages(
        [external('../CHANGELOG.md')],
        config({ external: [{ ...entry, locales: ['en', 'es'] }] }),
      ),
    );
    expect(errors[0]).toContain('changelog');
    expect(errors[0]).toContain('../CHANGELOG.es.md');
  });

  it('`./x.md` y `x.md` son el mismo archivo', () => {
    const pages = discoverPages(
      [external('x.md', '# X')],
      config({ locales: ['en'], external: [{ slug: 'x', file: './x.md' }] }),
    );
    expect(pages).toHaveLength(1);
  });

  it('seo y translations de la entrada llegan a todos los idiomas', () => {
    const pages = discoverPages(
      [external('../CHANGELOG.md'), external('../CHANGELOG.es.md')],
      config({ external: [{ ...entry, seo: { noindex: true }, translations: 'omit' }] }),
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
        config({ locales: ['en'], external: [entry] }),
      ),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('changelog.md');
    expect(errors[0]).toContain('../CHANGELOG.md');
  });

  it('el mismo slug en otro idioma no choca', () => {
    const pages = discoverPages(
      [native('changelog.es.md'), external('../CHANGELOG.md')],
      config({ external: [entry] }),
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

describe('discoverPages: _index.md', () => {
  it('es la fuente del índice de su carpeta: su slug es la carpeta, nunca `_index`', () => {
    const index = { layout: 'cards' as const, pageSize: 6 };
    const pages = discoverPages(
      [
        native('tutoriales/_index.md', '# Tutoriales', { index }),
        native('tutoriales/_index.en.md', '# Tutorials'),
        native('tutoriales/instalacion.md'),
      ],
      config({ locales: ['es', 'en'], defaultLocale: 'es' }),
    );
    const listings = pages.filter((page) => page.listing);
    expect(listings.map((page) => [page.slug, page.locale, page.title])).toEqual([
      ['tutoriales', 'es', 'Tutoriales'],
      ['tutoriales', 'en', 'Tutorials'],
    ]);
    expect(listings[0]).toMatchObject({
      kind: 'native',
      index,
      sourcePath: 'tutoriales/_index.md',
    });
    expect(pages.some((page) => page.slug.includes('_index'))).toBe(false);
  });

  it('un index.md de la carpeta gana: se ignoran todos sus _index.md', () => {
    const files = [
      native('tutoriales/index.md', '# Portada'),
      native('tutoriales/_index.md', '# Tutoriales'),
      native('tutoriales/_index.en.md', '# Tutorials'),
    ];
    const settings = config({ locales: ['es', 'en'], defaultLocale: 'es' });
    const pages = discoverPages(files, settings);
    expect(pages.map((page) => [page.slug, page.title, page.listing])).toEqual([
      ['tutoriales', 'Portada', undefined],
    ]);
    expect(ignoredListings(files, settings)).toEqual([
      'tutoriales/_index.md',
      'tutoriales/_index.en.md',
    ]);
  });

  it('el _index.md de la raíz es el de la portada', () => {
    const [page] = discoverPages([native('_index.md', '# Inicio')], config());
    expect(page).toMatchObject({ slug: '', listing: true });
  });
});

describe('discoverPages: `slug` propio (URL traducida)', () => {
  function bilingual() {
    return config({ locales: ['es', 'en'], defaultLocale: 'es' });
  }

  it('la traducción con `slug` conserva la identidad del archivo y guarda su URL aparte', () => {
    const pages = discoverPages(
      [
        native('tutoriales/instalacion.md'),
        native('tutoriales/instalacion.en.md', '# Installation', {
          slug: 'tutorials/installation',
        }),
      ],
      bilingual(),
    );
    expect(pages.map((page) => [page.slug, page.locale, page.urlSlug])).toEqual([
      ['tutoriales/instalacion', 'es', undefined],
      ['tutoriales/instalacion', 'en', 'tutorials/installation'],
    ]);
  });

  it('el archivo del idioma por defecto también puede fijar su `slug`', () => {
    const [page] = discoverPages(
      [native('tutoriales/instalacion.md', '# Instalación', { slug: 'blog/instalacion' })],
      bilingual(),
    );
    expect(page).toMatchObject({ slug: 'tutoriales/instalacion', urlSlug: 'blog/instalacion' });
  });

  it('un `_index.en.md` con `slug` mueve el listado de su carpeta, que sigue siendo la misma', () => {
    const pages = discoverPages(
      [
        native('tutoriales/_index.md', '# Tutoriales'),
        native('tutoriales/_index.en.md', '# Tutorials', { slug: 'tutorials' }),
      ],
      bilingual(),
    );
    expect(pages.map((page) => [page.slug, page.locale, page.urlSlug, page.listing])).toEqual([
      ['tutoriales', 'es', undefined, true],
      ['tutoriales', 'en', 'tutorials', true],
    ]);
  });

  it('un `slug` mal formado falla nombrando el archivo, el campo y la razón', () => {
    const errors = errorsOf(() =>
      discoverPages([native('a.en.md', '# A', { slug: 'en/a' })], bilingual()),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('a.en.md');
    expect(errors[0]).toContain('slug');
    expect(errors[0]).toContain('«en»');
  });

  it('un `slug` que coincide con la URL de otro archivo del mismo idioma falla nombrando ambos', () => {
    const errors = errorsOf(() =>
      discoverPages(
        [
          native('a.md'),
          native('a.en.md', '# A', { slug: 'guide' }),
          native('guide.md'),
          native('guide.en.md'),
        ],
        bilingual(),
      ),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('a.en.md (slug)');
    expect(errors[0]).toContain('guide.en.md');
  });

  it('el mismo `slug` en dos idiomas no choca: cada uno va con su prefijo', () => {
    const pages = discoverPages(
      [native('a.md', '# A', { slug: 'x' }), native('a.en.md', '# A', { slug: 'x' })],
      bilingual(),
    );
    expect(pages.map((page) => page.urlSlug)).toEqual(['x', 'x']);
  });
});
