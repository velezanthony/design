import { describe, expect, it } from 'vitest';
import { resolveFolders, type FoldersUserConfig } from '../config/folders';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import { buildFolderTree } from './folder-tree';
import { buildScopedSidebar, type NavContext } from './nav-sidebar';
import { prevNext } from './prev-next';
import { flatten, isSidebarGroup, type SidebarNode } from './sidebar';

const url: UrlPolicy = { base: '', trailingSlash: 'always', defaultLocale: 'es' };

function page(slug: string, locale = 'es', extra: Partial<Page> = {}): Page {
  return {
    slug,
    locale,
    title: `${slug.split('/').pop() || 'Inicio'} (${locale})`,
    kind: 'native',
    body: '',
    sourcePath: `${slug || 'index'}${locale === 'es' ? '' : `.${locale}`}.md`,
    ...extra,
  };
}

function generated(slug: string, title: string): Page {
  return page(slug, 'es', { kind: 'generated', title, sourcePath: `${slug}/_index.md` });
}

/* Como el sitio del autor: `articulos` con dos secciones sin `dir` (Desarrollo y Sistemas), páginas sin
   sección dentro de `articulos` y una sección de fuera (Guía). */
const pages = [
  page(''),
  page('articulos', 'es', { title: 'Artículos', sourcePath: 'articulos/_index.md' }),
  generated('articulos/sistemas', 'Sistemas'),
  generated('articulos/desarrollo', 'Desarrollo'),
  page('articulos/desarrollo/python/x'),
  page('articulos/sistemas/cloud/a'),
  page('articulos/sistemas/cloud/a', 'en'),
  page('articulos/sistemas/redes/b'),
  page('articulos/sueltos/c'),
  page('guia/uno'),
];

const nav: NavItem[] = [
  {
    label: { es: 'Desarrollo', en: 'Development' },
    sidebar: [{ label: 'Python', items: ['articulos/desarrollo/python/x'] }],
  },
  {
    label: { es: 'Sistemas', en: 'Systems' },
    sidebar: ['articulos/sistemas/cloud/a', 'articulos/sistemas/redes/b'],
  },
  { label: 'Guía', dir: 'guia' },
];

function context(
  slug: string,
  folders: FoldersUserConfig = { articulos: { tree: { show: 'all' } } },
  locale = 'es',
): NavContext {
  return {
    pages,
    availability: buildAvailability(pages, url),
    locale,
    config: {
      i18n: { locales: ['es', 'en'], defaultLocale: 'es' },
      content: { nav, sidebar: ['index', 'articulos'], folders: resolveFolders(folders) },
    },
    policies: resolvePolicies(pages, MissingTranslation.FALLBACK).policies,
    url,
    slug,
  };
}

function shape(nodes: SidebarNode[]): unknown[] {
  return nodes.map((node) =>
    isSidebarGroup(node) ? { [node.label]: shape(node.items) } : node.slug,
  );
}

describe('buildFolderTree', () => {
  const tree = buildFolderTree(context('articulos'), 'articulos');

  it('la página de la carpeta va arriba, como enlace del árbol', () => {
    expect(tree[0]).toMatchObject({ slug: 'articulos', href: '/articulos/', label: 'Artículos' });
  });

  it('las secciones con páginas bajo la carpeta salen como grupos de primer nivel con su etiqueta y su árbol', () => {
    expect(shape(tree)).toEqual([
      'articulos',
      { Desarrollo: [{ Python: ['articulos/desarrollo/python/x'] }] },
      { Sistemas: ['articulos/sistemas/cloud/a', 'articulos/sistemas/redes/b'] },
      { Sueltos: ['articulos/sueltos/c'] },
    ]);
  });

  it('el grupo de una sección enlaza la página de su carpeta («Sistemas» → /articulos/sistemas/)', () => {
    expect(tree[2]).toMatchObject({ label: 'Sistemas', href: '/articulos/sistemas/' });
  });

  it('las páginas sin sección de la carpeta salen con su árbol automático', () => {
    expect(tree[3]).toMatchObject({ label: 'Sueltos', dir: 'articulos/sueltos' });
  });

  it('las páginas de fuera no salen (ni la portada ni la sección Guía)', () => {
    const slugs = flatten(tree).map((leaf) => leaf.slug);
    expect(slugs).not.toContain('');
    expect(slugs).not.toContain('guia/uno');
  });

  it('en una ruta de reserva: textos del contenido y URLs de la ruta', () => {
    const fallback = buildFolderTree(context('articulos', undefined, 'en'), 'articulos', 'es');
    const leaves = flatten(fallback);
    const cloud = leaves.find((leaf) => leaf.slug === 'articulos/sistemas/cloud/a')!;
    const redes = leaves.find((leaf) => leaf.slug === 'articulos/sistemas/redes/b')!;
    expect(cloud).toMatchObject({ label: 'a (es)', href: '/en/articulos/sistemas/cloud/a/' });
    expect(redes).toMatchObject({ label: 'b (es)', href: '/en/articulos/sistemas/redes/b/' });
  });
});

describe('buildScopedSidebar con `tree.show`', () => {
  it("una página de sección bajo una carpeta con `show: 'all'` lleva el árbol de la carpeta", () => {
    const sidebar = buildScopedSidebar(context('articulos/sistemas/cloud/a'));
    expect(shape(sidebar)).toEqual(shape(buildFolderTree(context('articulos'), 'articulos')));
  });

  it('la página de la carpeta también, y la generada de una carpeta intermedia de una sección sin `dir`', () => {
    const expected = shape(buildFolderTree(context('articulos'), 'articulos'));
    expect(shape(buildScopedSidebar(context('articulos')))).toEqual(expected);
    expect(shape(buildScopedSidebar(context('articulos/sistemas')))).toEqual(expected);
  });

  it('una página de fuera lleva la de siempre', () => {
    expect(shape(buildScopedSidebar(context('guia/uno')))).toEqual(['guia/uno']);
  });

  it("`show: 'all'` heredado de un antepasado dibuja el árbol del antepasado (`declaredAt`)", () => {
    const sidebar = buildScopedSidebar(context('articulos/sistemas/cloud/a'));
    expect(sidebar[0]).toMatchObject({ slug: 'articulos' });
  });

  it("con `show: 'section'` (por defecto) nada cambia", () => {
    const sidebar = buildScopedSidebar(context('articulos/sistemas/cloud/a', {}));
    expect(shape(sidebar)).toEqual(['articulos/sistemas/cloud/a', 'articulos/sistemas/redes/b']);
  });

  it('anterior y siguiente siguen el árbol completo: saltan de una sección a otra', () => {
    const slug = 'articulos/desarrollo/python/x';
    const { next } = prevNext(flatten(buildScopedSidebar(context(slug))), slug);
    expect(next?.href).toBe('/articulos/sistemas/');
  });
});
