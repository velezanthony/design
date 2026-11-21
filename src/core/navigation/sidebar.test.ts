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
    { locales: ['en', 'es'], defaultLocale: 'en', sidebar },
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
  it('anida hasta tres niveles', () => {
    const tree = build([page('guide/api/a'), page('guide/api/b'), page('guide/c')]);
    expect(shape(tree)).toEqual([{ Guide: [{ Api: ['guide/api/a', 'guide/api/b'] }, 'guide/c'] }]);
  });

  it('no pasa de tres niveles: lo más profundo se aplana en la sección del segundo nivel', () => {
    const tree = build([page('a/b/c/d')]);
    expect(shape(tree)).toEqual([{ A: [{ B: ['a/b/c/d'] }] }]);
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
    const own = [page('install'), page('changelog', 'en', { translations: 'omit' })];
    expect(shape(build(own, 'es', undefined, MissingTranslation.LINK))).toEqual(['install']);
  });

  it('en el idioma de origen no hay insignias', () => {
    expect(shape(build(pages, 'en'))).toEqual(['changelog', 'install']);
    expect(build(pages, 'en').some((node) => 'badge' in node)).toBe(false);
  });

  it('una sección omitida entera desaparece', () => {
    const tree = build([page('guide/a', 'en', { translations: 'omit' })], 'es');
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

  it('conserva las hojas link con su insignia (prevNext las salta)', () => {
    const pages = [page('install', 'es'), page('changelog', 'en')];
    const leaves = flatten(build(pages, 'es', undefined, MissingTranslation.LINK));
    expect(leaves.find((leaf) => leaf.slug === 'changelog')?.badge).toBe('en');
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

const localeConfig = { locales: ['en', 'es'], defaultLocale: 'en' };

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
