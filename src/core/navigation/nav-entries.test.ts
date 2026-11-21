import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import { buildNav, type NavContext } from './nav-entries';
import { buildScopedSidebar } from './nav-sidebar';
import { flatten, isSidebarGroup, type SidebarNode } from './sidebar';
import { prevNext } from './prev-next';

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

const pages = [
  page(''),
  page('', 'es'),
  page('showcase'),
  page('changelog'),
  page('users/install'),
  page('users/install', 'es'),
  page('users/guide/columns'),
  page('users/guide/columns', 'es'),
  page('users/guide/queries'),
  page('contributors'),
  page('contributors', 'es'),
  page('contributors/testing'),
  page('contributors/testing', 'es'),
];

const nav: NavItem[] = [
  { label: { en: 'Guide', es: 'Guía' }, dir: 'users', sidebar: ['users/guide/queries'] },
  { label: 'Contributing', dir: 'contributors' },
  { label: { en: 'Changelog' }, slug: 'changelog' },
  { label: 'Code', href: 'https://github.com/x/y', icon: 'github' },
];

function context(
  locale = 'en',
  slug = '',
  extra: { nav?: NavItem[]; sidebar?: string[]; missing?: MissingTranslation } = {},
): NavContext {
  const { policies } = resolvePolicies(pages, extra.missing ?? MissingTranslation.LINK);
  return {
    pages,
    availability: buildAvailability(pages, url),
    locale,
    config: {
      locales: ['en', 'es'],
      defaultLocale: 'en',
      sidebar: extra.sidebar,
      nav: 'nav' in extra ? extra.nav : nav,
    },
    policies,
    url,
    slug,
  };
}

function slugsOf(nodes: SidebarNode[]) {
  return flatten(nodes).map((leaf) => leaf.slug);
}
function shape(nodes: SidebarNode[]): unknown[] {
  return nodes.map((node) =>
    isSidebarGroup(node) ? { [node.label]: shape(node.items) } : node.slug,
  );
}

describe('buildScopedSidebar', () => {
  it('una página de una sección ve solo el árbol de esa sección', () => {
    const tree = buildScopedSidebar(context('en', 'users/install'));
    expect(slugsOf(tree).sort()).toEqual([
      'users/guide/columns',
      'users/guide/queries',
      'users/install',
    ]);
  });

  it('el `sidebar` de la sección manda y el resto va detrás con el orden de siempre', () => {
    const tree = buildScopedSidebar(context('en', 'users/install'));
    expect(slugsOf(tree)[0]).toBe('users/guide/queries');
  });

  it('sin sidebar propio el árbol cuelga del dir: no repite su carpeta como grupo', () => {
    const tree = buildScopedSidebar(context('en', 'contributors/testing'));
    expect(shape(tree)).toEqual(['contributors', 'contributors/testing']);
    const deep = buildScopedSidebar(
      context('en', 'users/install', { nav: [{ label: 'G', dir: 'users' }] }),
    );
    expect(shape(deep)).toEqual([
      { Guide: ['users/guide/columns', 'users/guide/queries'] },
      'users/install',
    ]);
  });

  it('las páginas sin sección ven el sidebar de primer nivel limitado a ellas', () => {
    const tree = buildScopedSidebar(context('en', 'showcase', { sidebar: ['index', 'showcase'] }));
    expect(slugsOf(tree)).toEqual(['', 'showcase', 'changelog']);
  });

  it('sin sidebar de primer nivel, las páginas sin sección salen en lista automática', () => {
    const tree = buildScopedSidebar(context('en', ''));
    expect(slugsOf(tree).sort()).toEqual(['', 'changelog', 'showcase']);
  });

  it('entradas del sidebar de primer nivel que son de una sección se ignoran', () => {
    const tree = buildScopedSidebar(context('en', '', { sidebar: ['users/install', 'showcase'] }));
    expect(slugsOf(tree)).not.toContain('users/install');
    expect(slugsOf(tree)[0]).toBe('showcase');
  });

  it('una página de fuera del dir que nombra el sidebar entra en la sección, en su orden', () => {
    const loose: NavItem[] = [
      { label: 'G', dir: 'users', sidebar: ['changelog', 'users/install'] },
      { label: 'C', dir: 'contributors' },
    ];
    const tree = buildScopedSidebar(context('en', 'changelog', { nav: loose }));
    expect(slugsOf(tree)).toEqual([
      'changelog',
      'users/install',
      'users/guide/columns',
      'users/guide/queries',
    ]);
    expect(slugsOf(buildScopedSidebar(context('en', 'showcase', { nav: loose })))).not.toContain(
      'changelog',
    );
  });

  it('una sección sin dir se forma solo con su sidebar', () => {
    const only: NavItem[] = [{ label: 'G', sidebar: ['showcase', 'changelog'] }];
    expect(slugsOf(buildScopedSidebar(context('en', 'changelog', { nav: only })))).toEqual([
      'showcase',
      'changelog',
    ]);
    const entry = buildNav(only, context('en', 'changelog', { nav: only }))[0]!;
    expect(entry).toMatchObject({ kind: 'section', current: 'true' });
  });

  it('sin `nav` se comporta como siempre: todo el árbol', () => {
    const tree = buildScopedSidebar(context('en', 'showcase', { nav: undefined }));
    expect(slugsOf(tree)).toContain('users/install');
    expect(slugsOf(tree)).toContain('contributors');
  });

  it('aplica la política de traducción dentro de la sección', () => {
    const tree = buildScopedSidebar(context('es', 'users/install'));
    const queries = flatten(tree).find((leaf) => leaf.slug === 'users/guide/queries')!;
    expect(queries.badge).toBe('en');
    expect(queries.href).toBe('/repo/users/guide/queries/');
    const omit = buildScopedSidebar(
      context('es', 'users/install', { missing: MissingTranslation.OMIT }),
    );
    expect(slugsOf(omit)).not.toContain('users/guide/queries');
  });
});

describe('prev/next por sección', () => {
  it('no cruza la frontera de la sección', () => {
    const order = flatten(buildScopedSidebar(context('en', 'users/install')));
    const slugs = order.map((leaf) => leaf.slug);
    const last = slugs[slugs.length - 1]!;
    expect(prevNext(order, last).next).toBeUndefined();
    expect(prevNext(order, slugs[0]!).prev).toBeUndefined();
  });

  it('las páginas sin sección tienen vecinas solo entre ellas', () => {
    const order = flatten(
      buildScopedSidebar(context('en', 'showcase', { sidebar: ['index', 'showcase'] })),
    );
    expect(prevNext(order, 'showcase')).toMatchObject({
      prev: { slug: '' },
      next: { slug: 'changelog' },
    });
  });
});

describe('buildNav', () => {
  it('una entrada por item, en el orden de la config, con etiqueta del idioma', () => {
    const entries = buildNav(nav, context('es', ''));
    expect(entries.map((entry) => entry.label)).toEqual([
      'Guía',
      'Contributing',
      'Changelog',
      'Code',
    ]);
    expect(entries.map((entry) => entry.kind)).toEqual(['section', 'section', 'page', 'link']);
  });

  it('falta la etiqueta de un idioma: cae al idioma por defecto', () => {
    const entries = buildNav(nav, context('es', ''));
    expect(entries[2]!.label).toBe('Changelog');
  });

  it('una sección enlaza a su primera hoja (la del `sidebar` declarado)', () => {
    const entries = buildNav(nav, context('en', ''));
    expect(entries[0]!.href).toBe('/repo/users/guide/queries/');
  });

  it('si existe la página índice del dir, es el destino', () => {
    const entries = buildNav(nav, context('en', ''));
    expect(entries[1]!.href).toBe('/repo/contributors/');
  });

  it('los hrefs de sección y de página resuelven por idioma', () => {
    const entries = buildNav(nav, context('es', ''));
    expect(entries[1]!.href).toBe('/repo/es/contributors/');
    expect(entries[2]!.href).toBe('/repo/changelog/');
  });

  it('con política omit una página sin traducción desaparece de la cabecera', () => {
    const entries = buildNav(nav, context('es', '', { missing: MissingTranslation.OMIT }));
    expect(entries.map((entry) => entry.kind)).not.toContain('page');
  });

  it('el enlace externo conserva href, icono y se marca como externo', () => {
    const link = buildNav(nav, context('en', ''))[3]!;
    expect(link).toMatchObject({ href: 'https://github.com/x/y', icon: 'github', external: true });
    expect(buildNav(nav, context('en', ''))[0]!.external).toBeUndefined();
  });

  it('dentro de una sección: su item es `true` y, si es su destino, `page`', () => {
    const inside = buildNav(nav, context('en', 'users/install'));
    expect(inside[0]!.current).toBe('true');
    expect(inside.slice(1).every((entry) => entry.current === undefined)).toBe(true);
    const landing = buildNav(nav, context('en', 'users/guide/queries'));
    expect(landing[0]!.current).toBe('page');
  });

  it('una página suelta es `page` solo en ella misma y no activa ninguna sección', () => {
    const entries = buildNav(nav, context('en', 'changelog'));
    expect(entries.map((entry) => entry.current)).toEqual([
      undefined,
      undefined,
      'page',
      undefined,
    ]);
  });

  it('en la portada no hay nada activo', () => {
    expect(buildNav(nav, context('en', '')).every((entry) => entry.current === undefined)).toBe(
      true,
    );
  });

  it('sin `nav` no hay entradas', () => {
    expect(buildNav(undefined, context('en', ''))).toEqual([]);
  });
});

describe('buildNav: destino de una sección con páginas sin traducir', () => {
  function entryFor(docs: Page[], sidebar?: string[]) {
    const all = [page(''), page('', 'es'), ...docs];
    const { policies } = resolvePolicies(all, MissingTranslation.LINK);
    return buildNav([{ label: 'Docs', dir: 'docs', ...(sidebar && { sidebar }) }], {
      pages: all,
      availability: buildAvailability(all, url),
      locale: 'es',
      config: {
        locales: ['en', 'es'],
        defaultLocale: 'en',
        nav: [{ label: 'Docs', dir: 'docs', ...(sidebar && { sidebar }) }],
      },
      policies,
      url,
      slug: '',
    })[0]!;
  }

  it('prefiere una hoja traducida a la página índice que solo existe en otro idioma', () => {
    const entry = entryFor([page('docs'), page('docs/a', 'es'), page('docs/b', 'es')]);
    expect(entry.href).toBe('/repo/es/docs/a/');
  });

  it('si todas están en otro idioma, enlaza la primera', () => {
    const entry = entryFor([page('docs/a'), page('docs/b')]);
    expect(entry.href).toBe('/repo/docs/a/');
  });

  it('la página índice traducida gana a una hoja que el `sidebar` pone antes', () => {
    const entry = entryFor(
      [page('docs', 'es'), page('docs/a', 'es'), page('docs/b', 'es')],
      ['docs/b'],
    );
    expect(entry.href).toBe('/repo/es/docs/');
  });
});

describe('buildNav: `slug` propio', () => {
  it('la sección es la página actual si su destino es la URL de la ruta (`urlSlug`), no la de la identidad', () => {
    const translated = [
      page('users/install'),
      page('users/install', 'es', { urlSlug: 'usuarios/instalar' }),
    ];
    const { policies } = resolvePolicies(translated, MissingTranslation.LINK);
    const entries = buildNav([{ label: 'Guía', dir: 'users' }], {
      pages: translated,
      availability: buildAvailability(translated, url),
      locale: 'es',
      config: { locales: ['en', 'es'], defaultLocale: 'en' },
      policies,
      url,
      slug: 'users/install',
      urlSlug: 'usuarios/instalar',
    });
    expect(entries).toEqual([
      { label: 'Guía', href: '/repo/es/usuarios/instalar/', kind: 'section', current: 'page' },
    ]);
  });
});
