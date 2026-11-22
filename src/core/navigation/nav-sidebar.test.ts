import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import { resolveFolders, type FoldersUserConfig } from '../config/folders';
import { buildSectionSidebar, navScopeOf, type NavContext } from './nav-sidebar';
import { flatten, isSidebarGroup, type SidebarNode } from './sidebar';

const url: UrlPolicy = { base: '', trailingSlash: 'always', defaultLocale: 'es' };

function page(slug: string): Page {
  return { slug, locale: 'es', title: slug, kind: 'native', body: '', sourcePath: `${slug}.md` };
}

const pages = [page('guia/a'), page('guia/b'), page('suelta')];
const nav: NavItem[] = [
  { label: 'GitHub', href: 'https://github.com/x/y' },
  { label: 'Guía', dir: 'guia' },
];

const context: NavContext = {
  pages,
  availability: buildAvailability(pages, url),
  locale: 'es',
  config: { locales: ['es'], defaultLocale: 'es', nav },
  policies: resolvePolicies(pages, MissingTranslation.LINK).policies,
  url,
  slug: 'guia/a',
};

function slugs(scope: Parameters<typeof buildSectionSidebar>[1]) {
  return flatten(buildSectionSidebar(context, scope)).map((leaf) => leaf.slug);
}

describe('buildSectionSidebar', () => {
  it('el ámbito de una sección es el árbol de esa posición de `nav`', () => {
    expect(slugs({ kind: 'section', position: 1 })).toEqual(['guia/a', 'guia/b']);
  });

  it('el ámbito «sin sección» son las páginas que no cuelgan de ninguna', () => {
    expect(slugs({ kind: 'unsectioned' })).toEqual(['suelta']);
  });

  it('una posición que no es una sección se trata como «sin sección»', () => {
    expect(slugs({ kind: 'section', position: 0 })).toEqual(['suelta']);
  });
});

describe('navScopeOf', () => {
  it('la sección de una página, por su posición en `nav`', () => {
    expect(navScopeOf(nav, 'guia/b')).toEqual({ kind: 'section', position: 1 });
  });

  it('una página de ninguna sección, o un sitio sin `nav`, no tiene sección', () => {
    expect(navScopeOf(nav, 'suelta')).toEqual({ kind: 'unsectioned' });
    expect(navScopeOf(undefined, 'guia/a')).toEqual({ kind: 'unsectioned' });
  });
});

describe('buildSectionSidebar: `tree.depth` de `folders`', () => {
  const deep = [page('sis/cloud/aws/eu/a'), page('sis/cloud/b')];

  function tree(section: NavItem, folders: FoldersUserConfig = {}): unknown[] {
    // Cada grupo por su carpeta: el límite decide qué carpetas son grupo.
    function shape(nodes: SidebarNode[]): unknown[] {
      return nodes.map((node) =>
        isSidebarGroup(node) ? { [node.dir!]: shape(node.items) } : node.slug,
      );
    }
    return shape(
      buildSectionSidebar(
        {
          ...context,
          pages: deep,
          availability: buildAvailability(deep, url),
          config: { ...context.config, nav: [section], folders: resolveFolders(folders) },
          slug: 'sis/cloud/b',
        },
        { kind: 'section', position: 0 },
      ),
    );
  }

  it("el `depth` de la carpeta de la sección cuenta desde ella y gana al de `'*'`", () => {
    expect(
      tree(
        { label: 'S', dir: 'sis' },
        { '*': { tree: { depth: 1 } }, sis: { tree: { depth: 2 } } },
      ),
    ).toEqual([{ 'sis/cloud': [{ 'sis/cloud/aws': ['sis/cloud/aws/eu/a'] }, 'sis/cloud/b'] }]);
  });

  it("sin `depth` propio, la sección usa el de `'*'`, contado desde su carpeta", () => {
    expect(tree({ label: 'S', dir: 'sis' }, { '*': { tree: { depth: 1 } } })).toEqual([
      { 'sis/cloud': ['sis/cloud/aws/eu/a', 'sis/cloud/b'] },
    ]);
  });

  it('una carpeta por debajo con su `depth` gana al de la carpeta de la sección', () => {
    const folders = { sis: { tree: { depth: 1 } }, 'sis/cloud': { tree: { depth: 2 } } };
    expect(tree({ label: 'S', dir: 'sis' }, folders)).toEqual([
      {
        'sis/cloud': [
          { 'sis/cloud/aws': [{ 'sis/cloud/aws/eu': ['sis/cloud/aws/eu/a'] }] },
          'sis/cloud/b',
        ],
      },
    ]);
  });
});

/* Una sección sin `dir` solo es dueña de las páginas de su `sidebar`; aun así, sus grupos enlazan la
   página de su carpeta (una página generada que no está en ningún `sidebar`). */
describe('buildSectionSidebar: grupos enlazados en una sección sin `dir`', () => {
  const generated: Page = {
    ...page('articulos/sistemas/ci-cd'),
    kind: 'generated',
    title: 'CI/CD',
    sourcePath: 'articulos/sistemas/ci-cd/_index.md',
  };
  const all = [generated, page('articulos/sistemas/ci-cd/github'), page('suelta')];
  const sistemas: NavItem[] = [
    {
      label: 'Sistemas',
      sidebar: [{ label: 'CI/CD', items: ['articulos/sistemas/ci-cd/github'] }],
    },
  ];
  const withSection: NavContext = {
    ...context,
    pages: all,
    availability: buildAvailability(all, url),
    policies: resolvePolicies(all, MissingTranslation.LINK).policies,
    config: { locales: ['es'], defaultLocale: 'es', nav: sistemas },
    slug: 'articulos/sistemas/ci-cd/github',
  };

  it('el grupo enlaza la página de su carpeta aunque la sección no sea su dueña', () => {
    const [group] = buildSectionSidebar(withSection, { kind: 'section', position: 0 });
    expect(group).toMatchObject({ label: 'CI/CD', href: '/articulos/sistemas/ci-cd/' });
  });

  it('esa página sigue fuera de la sección (no cambia a qué sección pertenece)', () => {
    expect(navScopeOf(sistemas, 'articulos/sistemas/ci-cd')).toEqual({ kind: 'unsectioned' });
  });
});
