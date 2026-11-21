import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import { buildSectionSidebar, navScopeOf, type NavContext } from './nav-sidebar';
import { flatten } from './sidebar';

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
