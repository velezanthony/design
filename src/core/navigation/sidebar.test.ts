import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import {
  buildSidebar,
  flatten,
  isSidebarGroup,
  missingEntry,
  type SidebarGroup,
  type SidebarNode,
} from './sidebar';
import type { SidebarItem } from '../config/schema';
import { resolveFolders, type FoldersUserConfig } from '../config/folders';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };

function page(slug: string, locale = 'en', extra: Partial<Page> = {}): Page {
  return {
    slug,
    locale,
    title: slug.split('/').pop() || 'Home',
    kind: 'native',
    body: '',
    sourcePath: `${slug}.md`,
    ...extra,
  };
}

function build(
  pages: Page[],
  locale = 'en',
  sidebar?: SidebarItem[],
  missing: MissingTranslation = MissingTranslation.LINK,
): SidebarNode[] {
  const { policies } = resolvePolicies(pages, missing);
  return buildSidebar(
    pages,
    buildAvailability(pages, url),
    locale,
    { i18n: { locales: ['en', 'es'], defaultLocale: 'en' }, content: { sidebar } },
    policies,
    url,
  );
}

/** Forma compacta del árbol para las aserciones: `slug` para hojas, `{ slug: [...] }` para secciones. */
function shape(nodes: SidebarNode[]): unknown[] {
  return nodes.map((node) =>
    isSidebarGroup(node) ? { [node.label]: shape(node.items) } : node.slug,
  );
}

describe('buildSidebar: árbol', () => {
  it('anida dos carpetas: sección, sección y hoja', () => {
    const tree = build([page('guide/api/a'), page('guide/api/b'), page('guide/c')]);
    expect(shape(tree)).toEqual([{ Guide: [{ Api: ['guide/api/a', 'guide/api/b'] }, 'guide/c'] }]);
  });

  it('anida a cualquier profundidad: un grupo por carpeta', () => {
    const tree = build([page('a/b/c/d/page')]);
    expect(shape(tree)).toEqual([{ A: [{ B: [{ C: [{ D: ['a/b/c/d/page'] }] }] }] }]);
  });

  it('páginas a varios niveles: cada una en el grupo de su carpeta', () => {
    const tree = build([
      page('docs/python/django/y'),
      page('docs/python/x'),
      page('docs/python/django/orm/z'),
      page('docs/w'),
    ]);
    expect(shape(tree)).toEqual([
      {
        Docs: [
          {
            Python: [
              { Django: [{ Orm: ['docs/python/django/orm/z'] }, 'docs/python/django/y'] },
              'docs/python/x',
            ],
          },
          'docs/w',
        ],
      },
    ]);
  });

  it('los grupos profundos llevan `dir` y los retitula su página índice', () => {
    const tree = build([page('a/b/c', 'en', { title: 'Index C' }), page('a/b/c/d/page')]);
    const third = ((tree[0] as SidebarGroup).items[0] as SidebarGroup).items[0] as SidebarGroup;
    expect(third).toMatchObject({ label: 'Index C', slug: 'a/b/c', dir: 'a/b/c' });
    expect(third.items[0]).toMatchObject({ label: 'D', dir: 'a/b/c/d' });
  });

  it('una página índice hace de enlace de su sección', () => {
    const tree = build([page('guide', 'en', { title: 'Guide home' }), page('guide/a')]);
    const [group] = tree as SidebarGroup[];
    expect(group).toMatchObject({ label: 'Guide home', slug: 'guide', href: '/repo/guide/' });
    expect(shape(group?.items ?? [])).toEqual(['guide/a']);
  });

  it('una página suelta es una hoja con su título y su URL', () => {
    expect(build([page('install', 'en', { title: 'Install guide' })])).toEqual([
      { label: 'Install guide', slug: 'install', href: '/repo/install/' },
    ]);
  });

  it('la portada (slug vacío) es una hoja más', () => {
    expect(shape(build([page('', 'en', { title: 'Home' })]))).toEqual(['']);
  });

  it('usa las páginas del idioma pedido', () => {
    const pages = [page('install', 'en'), page('install', 'es', { title: 'Instalar' })];
    expect(build(pages, 'es')).toEqual([
      { label: 'Instalar', slug: 'install', href: '/repo/es/install/' },
    ]);
  });
});

describe('buildSidebar: orden', () => {
  it('lo declarado sigue el orden de la config y lo no listado va detrás', () => {
    const pages = [page('a'), page('b'), page('c')];
    expect(shape(build(pages, 'en', ['b', 'a']))).toEqual(['b', 'a', 'c']);
  });

  it('lo no declarado ordena por `order` y luego por Intl.Collator del slug', () => {
    const pages = [
      page('z'),
      page('x', 'en', { order: 2 }),
      page('y', 'en', { order: 1 }),
      page('a'),
    ];
    expect(shape(build(pages))).toEqual(['y', 'x', 'a', 'z']);
  });

  it('el collator compara números como números (v2 antes que v10)', () => {
    expect(shape(build([page('v10'), page('v2')]))).toEqual(['v2', 'v10']);
  });

  it('una sección declarada usa su etiqueta traducida y sus hijos en su orden', () => {
    const pages = [page('guide/c', 'es'), page('guide/d', 'es')];
    const config: SidebarItem[] = [
      { label: { en: 'Guide', es: 'Guía' }, items: ['guide/d', 'guide/c'] },
    ];
    expect(shape(build(pages, 'es', config))).toEqual([{ Guía: ['guide/d', 'guide/c'] }]);
  });

  it('una etiqueta de cadena sirve para todos los idiomas', () => {
    const config: SidebarItem[] = [{ label: 'Docs', items: ['a'] }];
    expect(shape(build([page('a')], 'en', config))).toEqual([{ Docs: ['a'] }]);
  });

  it('una sección declarada con `slug` enlaza esa página', () => {
    const config: SidebarItem[] = [{ label: 'Guide', slug: 'guide', items: ['guide/a'] }];
    const [group] = build([page('guide'), page('guide/a')], 'en', config) as SidebarGroup[];
    expect(group).toMatchObject({ label: 'Guide', href: '/repo/guide/', slug: 'guide' });
  });

  it('un slug declarado que no existe se ignora', () => {
    expect(shape(build([page('a')], 'en', ['ghost', 'a']))).toEqual(['a']);
  });
});

describe('buildSidebar: política de traducción ausente', () => {
  const pages = [page('install', 'en'), page('install', 'es'), page('changelog', 'en')];

  it('link: hoja con insignia del idioma de origen hacia el original', () => {
    const tree = build(pages, 'es', undefined, MissingTranslation.LINK);
    expect(tree).toContainEqual({
      label: 'changelog',
      slug: 'changelog',
      href: '/repo/changelog/',
      badge: 'en',
    });
  });

  it('fallback: hoja normal hacia /<locale>/<slug>/', () => {
    const tree = build(pages, 'es', undefined, MissingTranslation.FALLBACK);
    expect(tree).toContainEqual({
      label: 'changelog',
      slug: 'changelog',
      href: '/repo/es/changelog/',
    });
  });

  it('omit: sin hoja', () => {
    expect(shape(build(pages, 'es', undefined, MissingTranslation.OMIT))).toEqual(['install']);
  });

  it('la política de la página manda sobre la base', () => {
    const own = [
      page('install'),
      page('changelog', 'en', {
        translations: 'omit',
      }),
    ];
    expect(shape(build(own, 'es', undefined, MissingTranslation.LINK))).toEqual(['install']);
  });

  it('en el idioma de origen no hay insignias', () => {
    expect(shape(build(pages, 'en'))).toEqual(['changelog', 'install']);
    expect(build(pages, 'en').some((node) => 'badge' in node)).toBe(false);
  });

  it('una sección omitida entera desaparece', () => {
    const tree = build(
      [
        page('guide/a', 'en', {
          translations: 'omit',
        }),
      ],
      'es',
    );
    expect(tree).toEqual([]);
  });
});

describe('flatten', () => {
  it('aplana en orden de lectura, con la página de cada sección antes de sus hijas', () => {
    const tree = build([page('guide'), page('guide/a'), page('guide/b'), page('z')]);
    expect(flatten(tree).map((leaf) => leaf.slug)).toEqual(['guide', 'guide/a', 'guide/b', 'z']);
  });

  it('una sección sin página propia solo aporta sus hijas', () => {
    const tree = build([page('guide/a'), page('guide/b')]);
    expect(flatten(tree).map((leaf) => leaf.slug)).toEqual(['guide/a', 'guide/b']);
  });

  it('el `order` de una página profunda solo compite dentro de su carpeta', () => {
    const tree = build([
      page('g/b/c/deep', 'en', { order: 1 }),
      page('g/b/shallow', 'en', { order: 2 }),
    ]);
    // La carpeta `c` no tiene `order`: va detrás de la hermana que sí lo tiene.
    expect(flatten(tree).map((leaf) => leaf.slug)).toEqual(['g/b/shallow', 'g/b/c/deep']);
  });

  it('conserva las hojas link con su insignia (prevNext las salta)', () => {
    const pages = [page('install', 'es'), page('changelog', 'en')];
    const leaves = flatten(build(pages, 'es', undefined, MissingTranslation.LINK));
    expect(leaves.find((leaf) => leaf.slug === 'changelog')?.badge).toBe('en');
  });
});

/* Un slug declarado que es la página de una carpeta y el grupo automático de esa carpeta son la misma
   cosa: sale un solo grupo, en la posición declarada, con el título y el enlace de la página. */
describe('buildSidebar: slug declarado que es la página de una carpeta', () => {
  const articles = [
    page('articulos', 'en', { title: 'Artículos' }),
    page('articulos/a/x'),
    page('articulos/b'),
    page('intro'),
  ];

  it('da un solo grupo, en la posición declarada, con el título y el href de la página', () => {
    const tree = build(articles, 'en', ['intro', 'articulos']);
    expect(shape(tree)).toEqual([
      'intro',
      { Artículos: [{ A: ['articulos/a/x'] }, 'articulos/b'] },
    ]);
    expect(tree[1]).toMatchObject({ slug: 'articulos', href: '/repo/articulos/' });
  });

  it('la posición declarada manda aunque el grupo automático fuera detrás', () => {
    const tree = build([...articles, page('zeta')], 'en', ['articulos']);
    expect(shape(tree)).toEqual([
      { Artículos: [{ A: ['articulos/a/x'] }, 'articulos/b'] },
      'intro',
      'zeta',
    ]);
  });

  it('lo mismo dentro de un grupo declarado', () => {
    const tree = build(articles, 'en', [{ label: 'Blog', items: ['articulos'] }]);
    expect(shape(tree)).toEqual([
      { Blog: [{ Artículos: [{ A: ['articulos/a/x'] }, 'articulos/b'] }] },
      'intro',
    ]);
    expect((tree[0] as SidebarGroup).items[0]).toMatchObject({ href: '/repo/articulos/' });
  });

  it('a cualquier profundidad de carpeta: el grupo sale de su padre automático', () => {
    const tree = build(
      [page('docs/python', 'en', { title: 'Python' }), page('docs/python/x'), page('docs/y')],
      'en',
      ['docs/python'],
    );
    expect(shape(tree)).toEqual([{ Python: ['docs/python/x'] }, { Docs: ['docs/y'] }]);
  });

  it('las páginas de la carpeta declaradas aparte se quedan donde se declaran', () => {
    const tree = build(articles, 'en', ['articulos/b', 'articulos']);
    expect(shape(tree)).toEqual([
      'articulos/b',
      { Artículos: [{ A: ['articulos/a/x'] }] },
      'intro',
    ]);
  });

  it('un slug declarado que no es carpeta sigue siendo hoja', () => {
    const tree = build(articles, 'en', ['intro']);
    expect(shape(tree)).toEqual([
      'intro',
      { Artículos: [{ A: ['articulos/a/x'] }, 'articulos/b'] },
    ]);
  });

  it('una carpeta cuyas páginas ya están todas declaradas sigue siendo hoja', () => {
    const tree = build([page('guide'), page('guide/a')], 'en', ['guide/a', 'guide']);
    expect(shape(tree)).toEqual(['guide/a', 'guide']);
  });
});

/* Una página que lista su carpeta (generada o de un `_index.md`) no es una entrada de la navegación:
   da título y destino al grupo de su carpeta, pero nunca sale como hoja suelta. */
describe('buildSidebar: páginas que listan su carpeta', () => {
  const generated = page('guia', 'en', {
    kind: 'generated',
    title: 'Guía',
    sourcePath: 'guia/_index.md',
  });

  it('una página generada enlaza el grupo de su carpeta', () => {
    const tree = build([generated, page('guia/a'), page('guia/b')]);
    expect(shape(tree)).toEqual([{ Guía: ['guia/a', 'guia/b'] }]);
    expect(tree[0]).toMatchObject({ slug: 'guia', href: '/repo/guia/' });
  });

  it('sin grupo (sus páginas están declaradas en otro sitio) no sale como hoja', () => {
    expect(shape(build([generated, page('guia/a')], 'en', ['guia/a']))).toEqual(['guia/a']);
  });

  it('si su grupo se queda vacío (sus hijas también listan) no sale como hoja', () => {
    const child = page('guia/avanzado', 'en', {
      kind: 'generated',
      sourcePath: 'guia/avanzado/_index.md',
    });
    expect(
      shape(build([generated, child, page('guia/avanzado/x')], 'en', ['guia/avanzado/x'])),
    ).toEqual(['guia/avanzado/x']);
  });

  it('la de la carpeta raíz del árbol (el `dir` de una sección) sí sale: es el destino de la sección', () => {
    const pages = [generated, page('guia/a')];
    const { policies } = resolvePolicies(pages, MissingTranslation.LINK);
    const tree = buildSidebar(
      pages,
      buildAvailability(pages, url),
      'en',
      { i18n: { locales: ['en', 'es'], defaultLocale: 'en' }, content: {} },
      policies,
      url,
      'guia',
    );
    expect(shape(tree)).toEqual(['guia', 'guia/a']);
  });

  it('la de un `_index.md` tampoco sale como hoja', () => {
    const own = page('guia', 'en', { sourcePath: 'guia/_index.md' });
    expect(shape(build([own, page('guia/a')], 'en', ['guia/a']))).toEqual(['guia/a']);
  });

  it('un `index.md` sin grupo sigue siendo hoja', () => {
    const own = page('guia', 'en', { sourcePath: 'guia/index.md' });
    expect(shape(build([own, page('guia/a')], 'en', ['guia/a']))).toEqual(['guia/a', 'guia']);
  });

  it('declarada a mano en `sidebar` sale donde se declara', () => {
    expect(shape(build([generated, page('guia/a')], 'en', ['guia/a', 'guia']))).toEqual([
      'guia/a',
      'guia',
    ]);
  });
});

/* Las carpetas son categorías: la etiqueta de un grupo lleva a la página de su carpeta si existe,
   venga de donde venga (generada, `_index.md` o `index.md`). */
describe('buildSidebar: grupos enlazados a la página de su carpeta', () => {
  it.each([
    ['generada', { kind: 'generated' as const, sourcePath: 'guia/_index.md' }],
    ['de un `_index.md`', { sourcePath: 'guia/_index.md' }],
    ['de un `index.md`', { sourcePath: 'guia/index.md' }],
  ])('un grupo automático enlaza la página %s de su carpeta', (_kind, extra) => {
    const tree = build([page('guia', 'en', { title: 'Guía', ...extra }), page('guia/a')]);
    expect(tree[0]).toMatchObject({ label: 'Guía', href: '/repo/guia/', slug: 'guia' });
  });

  it('sin página índice, el grupo no lleva `href`', () => {
    const [group] = build([page('guia/a'), page('guia/b')]);
    expect(group).not.toHaveProperty('href');
  });

  const folderPage = page('docs/cloud/aws', 'en', {
    kind: 'generated',
    title: 'AWS (carpeta)',
    sourcePath: 'docs/cloud/aws/_index.md',
  });
  const pages = [folderPage, page('docs/cloud/aws/basica'), page('docs/ci/github')];

  it('un grupo declarado sin `slug` cuyas hojas comparten una carpeta con página la enlaza', () => {
    const tree = build(pages, 'en', [{ label: 'AWS', items: ['docs/cloud/aws/basica'] }]);
    expect(tree[0]).toMatchObject({
      label: 'AWS',
      slug: 'docs/cloud/aws',
      href: '/repo/docs/cloud/aws/',
    });
  });

  it('la página destino no sale además como hoja ni en el árbol automático', () => {
    const tree = build(pages, 'en', [{ label: 'AWS', items: ['docs/cloud/aws/basica'] }]);
    expect(flatten(tree).filter((leaf) => leaf.slug === 'docs/cloud/aws')).toHaveLength(1);
    expect(shape(tree)).toEqual([
      { AWS: ['docs/cloud/aws/basica'] },
      { Docs: [{ Ci: ['docs/ci/github'] }] },
    ]);
  });

  it('el grupo que solo envuelve a otro enlaza la carpeta de encima si tiene página; el interior, la suya', () => {
    const cloudPage = page('docs/cloud', 'en', {
      kind: 'generated',
      sourcePath: 'docs/cloud/_index.md',
    });
    const declared: SidebarItem[] = [
      { label: 'Cloud', items: [{ label: 'AWS', items: ['docs/cloud/aws/basica'] }] },
    ];
    const tree = build([...pages, cloudPage], 'en', declared);
    const cloud = tree[0] as SidebarGroup;
    expect(cloud).toMatchObject({ label: 'Cloud', href: '/repo/docs/cloud/' });
    expect(cloud.items[0]).toMatchObject({ label: 'AWS', href: '/repo/docs/cloud/aws/' });
    // Sin página en `docs/cloud`, «Cloud» sigue siendo texto.
    expect(build(pages, 'en', declared)[0]).not.toHaveProperty('href');
  });

  it('un `slug` declarado a mano manda', () => {
    const tree = build([...pages, page('docs/ci/github')], 'en', [
      { label: 'AWS', slug: 'docs/ci/github', items: ['docs/cloud/aws/basica'] },
    ]);
    expect(tree[0]).toMatchObject({ slug: 'docs/ci/github', href: '/repo/docs/ci/github/' });
  });

  it('grupos que no se envuelven y comparten carpeta (un sitio plano): ninguno la enlaza', () => {
    const flat = [
      page('tutoriales', 'en', { sourcePath: 'tutoriales/index.md' }),
      page('tutoriales/a'),
      page('tutoriales/b'),
    ];
    const tree = build(flat, 'en', [
      { label: 'Uno', items: ['tutoriales/a'] },
      { label: 'Dos', items: ['tutoriales/b'] },
    ]);
    expect(tree[0]).not.toHaveProperty('href');
    expect(tree[1]).not.toHaveProperty('href');
    expect(shape(tree)).toEqual([
      { Uno: ['tutoriales/a'] },
      { Dos: ['tutoriales/b'] },
      'tutoriales',
    ]);
  });

  it('el destino pasa por la política: `omit` sin traducción, sin enlace; `link`, al original con insignia', () => {
    const source = [
      page('docs/cloud/aws', 'es', { kind: 'generated', sourcePath: 'docs/cloud/aws/_index.md' }),
      page('docs/cloud/aws/basica'),
    ];
    const declared: SidebarItem[] = [{ label: 'AWS', items: ['docs/cloud/aws/basica'] }];
    const omitted = build(source, 'en', declared, MissingTranslation.OMIT);
    expect(omitted[0]).not.toHaveProperty('href');
    const linked = build(source, 'en', declared, MissingTranslation.LINK);
    expect(linked[0]).toMatchObject({ href: '/repo/es/docs/cloud/aws/', badge: 'es' });
  });
});

describe('buildSidebar: portada en la config', () => {
  it("'index' coloca la portada donde se declara", () => {
    const pages = [page(''), page('guide'), page('install')];
    expect(shape(build(pages, 'en', ['guide', 'index']))).toEqual(['guide', '', 'install']);
  });

  it("una sección puede apuntar a la portada con slug 'index'", () => {
    const pages = [page(''), page('guide')];
    const tree = build(pages, 'en', [{ label: 'Home', slug: 'index', items: ['guide'] }]);
    expect((tree[0] as SidebarGroup).slug).toBe('');
  });
});

const localeConfig = { i18n: { locales: ['en', 'es'], defaultLocale: 'en' } };

describe('missingEntry', () => {
  const available = { en: '/repo/changelog/' };

  it('link: hoja hacia el original con la insignia del idioma de origen', () => {
    expect(
      missingEntry(
        'changelog',
        'Changelog',
        available,
        'es',
        MissingTranslation.LINK,
        localeConfig,
        url,
      ),
    ).toEqual({ label: 'Changelog', slug: 'changelog', href: '/repo/changelog/', badge: 'en' });
  });

  it('link: el origen es el primer idioma disponible si falta el idioma por defecto', () => {
    const entry = missingEntry(
      'x',
      'X',
      { es: '/repo/es/x/' },
      'en',
      MissingTranslation.LINK,
      localeConfig,
      url,
    );
    expect(entry).toMatchObject({ href: '/repo/es/x/', badge: 'es' });
  });

  it('fallback: hoja normal, sin insignia, hacia la ruta de reserva del idioma', () => {
    expect(
      missingEntry(
        'changelog',
        'Changelog',
        available,
        'es',
        MissingTranslation.FALLBACK,
        localeConfig,
        url,
      ),
    ).toEqual({ label: 'Changelog', slug: 'changelog', href: '/repo/es/changelog/' });
  });

  it('omit: sin hoja', () => {
    expect(
      missingEntry(
        'changelog',
        'Changelog',
        available,
        'es',
        MissingTranslation.OMIT,
        localeConfig,
        url,
      ),
    ).toBeNull();
  });
});

describe('buildSidebar: casos límite', () => {
  it('el nombre de una sección sin página índice sale de su carpeta, con los separadores como espacios', () => {
    expect(shape(build([page('getting-started/a'), page('x--y_z/b')]))).toEqual([
      { 'Getting started': ['getting-started/a'] },
      { 'X y z': ['x--y_z/b'] },
    ]);
  });

  describe('`order`', () => {
    it('con el mismo `order` desempata el collator, no la posición de entrada', () => {
      const pages = [
        page('z', 'en', { order: 1 }),
        page('m', 'en', { order: 1 }),
        page('a', 'en', { order: 1 }),
      ];
      expect(shape(build(pages))).toEqual(['a', 'm', 'z']);
    });

    it('una sección ordena por el `order` de su página índice', () => {
      const pages = [
        page('a'),
        page('guide', 'en', { order: 1 }),
        page('guide/x'),
        page('guide/y'),
      ];
      expect(shape(build(pages))).toEqual([{ guide: ['guide/x', 'guide/y'] }, 'a']);
    });

    it('lo mismo dentro de una sección anidada', () => {
      const pages = [
        page('g/a'),
        page('g/z', 'en', { order: 1 }),
        page('g/z/x'),
        page('g/b', 'en', { order: 2 }),
      ];
      expect(shape(build(pages))).toEqual([{ G: [{ z: ['g/z/x'] }, 'g/b', 'g/a'] }]);
    });

    it('una página sin traducir conserva el `order` de su original', () => {
      const pages = [page('x', 'en', { order: 1 }), page('a', 'es'), page('b', 'es', { order: 2 })];
      expect(shape(build(pages, 'es'))).toEqual(['x', 'b', 'a']);
    });
  });

  describe('secciones declaradas con `slug`', () => {
    it('sin hijas es una hoja, con la insignia de su página si no está traducida', () => {
      const config: SidebarItem[] = [{ label: 'Guía', slug: 'guide' }];
      expect(build([page('guide', 'en')], 'es', config)).toEqual([
        { label: 'Guía', slug: 'guide', href: '/repo/guide/', badge: 'en' },
      ]);
    });

    it('con hijas conserva la insignia en la sección', () => {
      const config: SidebarItem[] = [{ label: 'Guía', slug: 'guide', items: ['guide/a'] }];
      const [group] = build([page('guide', 'en'), page('guide/a', 'es')], 'es', config);
      expect(group).toMatchObject({ badge: 'en' });
    });
  });

  describe('insignia de la sección automática', () => {
    it('la hereda de su página índice sin traducir y la deja fuera si está traducida', () => {
      const [untranslated] = build([page('guide', 'en'), page('guide/a', 'es')], 'es');
      expect(untranslated).toMatchObject({ badge: 'en' });
      const [translated] = build([page('guide', 'es'), page('guide/a', 'es')], 'es');
      expect(translated).not.toHaveProperty('badge');
    });

    it('`flatten` la conserva en la hoja de la sección', () => {
      const tree = build([page('guide', 'en'), page('guide/a', 'es')], 'es');
      expect(flatten(tree)[0]).toMatchObject({ slug: 'guide', badge: 'en' });
    });
  });
});

describe('buildSidebar: carpeta raíz de una sección (`base`)', () => {
  function buildIn(pages: Page[], base: string): SidebarNode[] {
    const { policies } = resolvePolicies(pages, MissingTranslation.LINK);
    const config = { i18n: { locales: ['en'], defaultLocale: 'en' }, content: {} };
    return buildSidebar(pages, buildAvailability(pages, url), 'en', config, policies, url, base);
  }

  it('la carpeta raíz no es un grupo y lo de debajo anida a cualquier profundidad', () => {
    const tree = buildIn([page('root/a/b/c/d/page'), page('root/top')], 'root');
    expect(shape(tree)).toEqual([
      { A: [{ B: [{ C: [{ D: ['root/a/b/c/d/page'] }] }] }] },
      'root/top',
    ]);
  });

  it('una base de varios segmentos cuenta desde su final', () => {
    const tree = buildIn(
      [page('x/sistemas/cloud/aws/eu/a'), page('x/sistemas/cloud/b')],
      'x/sistemas',
    );
    expect(shape(tree)).toEqual([
      { Cloud: [{ Aws: [{ Eu: ['x/sistemas/cloud/aws/eu/a'] }] }, 'x/sistemas/cloud/b'] },
    ]);
  });
});

describe('buildSidebar: carpeta de los grupos automáticos', () => {
  it('un grupo automático lleva `dir` con la ruta de su carpeta', () => {
    const [group] = build([page('guide/api/a'), page('guide/b')]) as SidebarGroup[];
    expect(group).toMatchObject({ label: 'Guide', dir: 'guide' });
    const [inner] = group!.items as SidebarGroup[];
    expect(inner).toMatchObject({ label: 'Api', dir: 'guide/api' });
  });

  it('también cuando una página índice le da otro título', () => {
    const [group] = build([
      page('guide', 'en', { title: 'Manual' }),
      page('guide/a'),
    ]) as SidebarGroup[];
    expect(group).toMatchObject({ label: 'Manual', slug: 'guide', dir: 'guide' });
  });

  it('un grupo escrito en `sidebar` no lleva `dir`', () => {
    const config: SidebarItem[] = [{ label: 'Guide', items: ['guide/a', 'guide/b'] }];
    const [group] = build([page('guide/a'), page('guide/b')], 'en', config);
    expect(group).not.toHaveProperty('dir');
  });
});

describe('buildSidebar: `slug` propio', () => {
  const pages = [
    page('tutoriales/a', 'en'),
    page('tutoriales/a', 'es', { urlSlug: 'tutorials/a-es' }),
    page('tutoriales/b', 'en', { urlSlug: 'blog/b' }),
  ];

  it('la hoja de cada idioma enlaza su URL traducida y el árbol sigue la carpeta del archivo', () => {
    expect(build(pages, 'es')).toEqual([
      {
        label: 'Tutoriales',
        dir: 'tutoriales',
        items: [
          { label: 'a', slug: 'tutoriales/a', href: '/repo/es/tutorials/a-es/' },
          { label: 'b', slug: 'tutoriales/b', href: '/repo/blog/b/', badge: 'en' },
        ],
      },
    ]);
  });

  it('el orden declarado sigue usando la identidad: `tutoriales/a` encuentra la URL traducida', () => {
    const tree = build(pages, 'es', ['tutoriales/a']);
    expect(tree[0]).toEqual({ label: 'a', slug: 'tutoriales/a', href: '/repo/es/tutorials/a-es/' });
  });

  it('fallback: la reserva va al `slug` del original con el prefijo del idioma', () => {
    const tree = flatten(build(pages, 'es', undefined, MissingTranslation.FALLBACK));
    expect(tree).toContainEqual({ label: 'b', slug: 'tutoriales/b', href: '/repo/es/blog/b/' });
  });
});

describe('buildSidebar: `tree.depth` de `folders`', () => {
  const deep = [
    page('a/x'),
    page('a/b/y'),
    page('a/b/c/z'),
    page('a/b/c/d/w'),
    page('a/b/c/d/v', 'en', { order: 1 }),
  ];

  /** `folders` con `tree.depth`: `all` en `'*'` y uno por carpeta. */
  function depths(all?: number, byFolder: Record<string, number> = {}): FoldersUserConfig {
    return {
      ...(all !== undefined && { '*': { tree: { depth: all } } }),
      ...Object.fromEntries(
        Object.entries(byFolder).map(([folder, depth]) => [folder, { tree: { depth } }]),
      ),
    };
  }

  function capped(
    pages: Page[],
    user: FoldersUserConfig | undefined,
    base = '',
    sidebar?: SidebarItem[],
  ): unknown[] {
    const { policies } = resolvePolicies(pages, MissingTranslation.LINK);
    const config = {
      i18n: { locales: ['en'], defaultLocale: 'en' },
      content: { sidebar, folders: resolveFolders(user) },
    };
    return shape(
      buildSidebar(pages, buildAvailability(pages, url), 'en', config, policies, url, base),
    );
  }

  const unlimited = [
    {
      A: [{ B: [{ C: [{ D: ['a/b/c/d/v', 'a/b/c/d/w'] }, 'a/b/c/z'] }, 'a/b/y'] }, 'a/x'],
    },
  ];

  it('sin límite (por defecto) anida todas las carpetas', () => {
    expect(capped(deep, undefined)).toEqual(unlimited);
    expect(capped(deep, depths())).toEqual(unlimited);
  });

  it('un límite igual o mayor que la profundidad no cambia nada', () => {
    expect(capped(deep, depths(4))).toEqual(unlimited);
    expect(capped(deep, depths(9))).toEqual(unlimited);
  });

  it('límite 1: un solo nivel de grupos, lo de debajo plano en él y en el orden de siempre', () => {
    expect(capped(deep, depths(1))).toEqual([
      { A: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z', 'a/b/y', 'a/x'] },
    ]);
  });

  it("límite de `'*'`: lo más profundo va al grupo más hondo permitido", () => {
    expect(capped(deep, depths(2))).toEqual([
      { A: [{ B: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z', 'a/b/y'] }, 'a/x'] },
    ]);
  });

  it('una página índice de una carpeta aplanada queda como hoja, nunca se oculta', () => {
    const pages = [...deep, page('a/b/c', 'en', { title: 'Index C' })];
    expect(capped(pages, depths(2))).toEqual([
      { A: [{ B: ['a/b/c/d/v', 'a/b/c', 'a/b/c/d/w', 'a/b/c/z', 'a/b/y'] }, 'a/x'] },
    ]);
  });

  it("el límite de `'*'` cuenta desde la carpeta raíz de una sección", () => {
    const pages = deep.map((item) => page(`root/${item.slug}`, 'en', { order: item.order }));
    expect(capped(pages, depths(1), 'root')).toEqual([
      { A: ['root/a/b/c/d/v', 'root/a/b/c/d/w', 'root/a/b/c/z', 'root/a/b/y', 'root/a/x'] },
    ]);
  });

  it("una carpeta con su `depth` cuenta desde ella y gana al límite de `'*'`", () => {
    // El de `'*'` (2) aplanaría `a/b/c`; `a/b: 1`, contando desde `a/b`, la deja y aplana lo de debajo.
    expect(capped(deep, depths(2, { 'a/b': 1 }))).toEqual([
      { A: [{ B: [{ C: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z'] }, 'a/b/y'] }, 'a/x'] },
    ]);
    // Sin límite en `'*'`, solo frena por debajo de su carpeta.
    expect(capped(deep, depths(undefined, { a: 1 }))).toEqual([
      { A: [{ B: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z', 'a/b/y'] }, 'a/x'] },
    ]);
  });

  it('una carpeta con su `depth` no rescata su propia carpeta si un límite de arriba ya la aplana', () => {
    expect(capped(deep, depths(1, { 'a/b': 3 }))).toEqual([
      { A: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z', 'a/b/y', 'a/x'] },
    ]);
  });

  it('con `depth` anidados manda el más cercano', () => {
    expect(capped(deep, depths(undefined, { a: 1, 'a/b': 9 }))).toEqual(unlimited);
    expect(capped(deep, depths(undefined, { a: 9, 'a/b/c': 1, 'a/b/c/d': 5 }))).toEqual(unlimited);
    expect(capped(deep, depths(undefined, { a: 9, 'a/b': 1 }))).toEqual([
      { A: [{ B: [{ C: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z'] }, 'a/b/y'] }, 'a/x'] },
    ]);
  });

  it('los grupos escritos a mano en `sidebar` no cambian', () => {
    const sidebar: SidebarItem[] = [
      {
        label: 'Hand',
        items: [{ label: 'Deeper', items: [{ label: 'Deepest', items: ['a/x'] }] }],
      },
    ];
    expect(capped(deep, depths(1), '', sidebar)).toEqual([
      { Hand: [{ Deeper: [{ Deepest: ['a/x'] }] }] },
      { A: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z', 'a/b/y'] },
    ]);
  });

  it('un `depth` heredado por una carpeta hija cuenta desde la carpeta que lo declaró', () => {
    // `a: 2` deja `a/b` y `a/b/c`; `a/b/c/d`, aunque herede el ajuste, queda cortada: cuenta desde `a`.
    expect(capped(deep, depths(undefined, { a: 2 }))).toEqual([
      { A: [{ B: [{ C: ['a/b/c/d/v', 'a/b/c/d/w', 'a/b/c/z'] }, 'a/b/y'] }, 'a/x'] },
    ]);
  });

  it('un `depth` declarado por encima del `dir` de una sección cuenta desde la carpeta declarante', () => {
    const pages = deep.map((item) => page(`root/${item.slug}`, 'en', { order: item.order }));
    // `root: 3` desde `root`: `root/a/b` y `root/a/b/c` caben; `root/a/b/c/d`, no. Contado desde el
    // `dir` (`root/a`) cabrían tres niveles por debajo de él.
    expect(capped(pages, depths(undefined, { root: 3 }), 'root/a')).toEqual([
      { B: [{ C: ['root/a/b/c/d/v', 'root/a/b/c/d/w', 'root/a/b/c/z'] }, 'root/a/b/y'] },
      'root/a/x',
    ]);
  });
});
