import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import type { NavContext } from './nav-sidebar';
import { navScopes, pageBlurb, scopeTrees, walkScope, type ScopeVisitor } from './nav-walk';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'es' };

function page(slug: string, locale = 'es', extra: Partial<Page> = {}): Page {
  return {
    slug,
    locale,
    title: `${slug.split('/').pop()} (${locale})`,
    kind: 'native',
    body: '',
    sourcePath: `${slug}.md`,
    ...extra,
  };
}

const pages = [
  page('guia/a'),
  page('guia/a', 'en'),
  page('guia/b', 'es', { translations: MissingTranslation.OMIT }),
  page('guia/c'),
  page('suelta'),
];

const nav: NavItem[] = [
  { label: 'GitHub', href: 'https://github.com/x/y' },
  {
    label: { es: 'Guía', en: 'Guide' },
    sidebar: [{ label: 'Grupo', items: ['guia/a', 'guia/b'] }, 'guia/c'],
  },
];

function context(locale = 'es'): NavContext {
  return {
    pages,
    availability: buildAvailability(pages, url),
    locale,
    config: { i18n: { locales: ['es', 'en'], defaultLocale: 'es' }, content: { nav } },
    policies: resolvePolicies(pages, MissingTranslation.FALLBACK).policies,
    url,
    slug: 'guia/a',
  };
}

/** Un visitante mínimo: cada página como `título → URL`, cada grupo con sus hijas. */
const describeTree: ScopeVisitor<string | { group: string; items: unknown[] }, undefined> = {
  page: (node, target) => `${node.label} → ${target.href}`,
  group: (group, own, items) =>
    items.length === 0 && !own
      ? []
      : [{ group: group.label, items: own ? [own, ...items] : items }],
};

describe('navScopes', () => {
  it('cada sección de `nav` por su posición y, al final, las páginas sin sección', () => {
    expect(navScopes(nav)).toEqual([{ kind: 'section', position: 1 }, { kind: 'unsectioned' }]);
  });

  it('sin `nav`, solo «sin sección»', () => {
    expect(navScopes(undefined)).toEqual([{ kind: 'unsectioned' }]);
  });
});

describe('scopeTrees y walkScope', () => {
  it('recorre el árbol de una sección con su destino', () => {
    const trees = scopeTrees(context(), 'es', { kind: 'section', position: 1 });
    expect(walkScope(trees, describeTree, undefined)).toEqual([
      { group: 'Grupo', items: ['a (es) → /repo/guia/a/', 'b (es) → /repo/guia/b/'] },
      'c (es) → /repo/guia/c/',
    ]);
  });

  it('el ámbito «sin sección» recorre lo que no cuelga de ninguna', () => {
    const trees = scopeTrees(context(), 'es', { kind: 'unsectioned' });
    expect(walkScope(trees, describeTree, undefined)).toEqual(['suelta (es) → /repo/suelta/']);
  });

  it('en una ruta de reserva: los textos del contenido y las URLs de la ruta', () => {
    const trees = scopeTrees(context('en'), 'es', { kind: 'section', position: 1 });
    expect(walkScope(trees, describeTree, undefined)).toEqual([
      { group: 'Grupo', items: ['a (es) → /repo/en/guia/a/'] },
      'c (es) → /repo/en/guia/c/',
    ]);
  });

  it('una página que la política omite en el idioma de la ruta no aparece', () => {
    const trees = scopeTrees(context('en'), 'en', { kind: 'section', position: 1 });
    const walked = JSON.stringify(walkScope(trees, describeTree, undefined));
    expect(walked).not.toContain('guia/b');
    expect(walked).toContain('a (en) → /repo/en/guia/a/');
  });

  it('el contexto de cada nivel lo decide el visitante', () => {
    const trees = scopeTrees(context(), 'es', { kind: 'section', position: 1 });
    const paths = walkScope<string, string[]>(
      trees,
      {
        page: (node, _target, path) => [...path, node.label].join(' › '),
        group: (_group, own, items) => (own ? [own, ...items] : items),
        inside: (group, path) => [...path, group.label],
      },
      ['Guía'],
    );
    expect(paths).toEqual(['Guía › Grupo › a (es)', 'Guía › Grupo › b (es)', 'Guía › c (es)']);
  });
});

describe('pageBlurb', () => {
  const described = page('a', 'es', {
    index: { summary: 'Resumen propio.' },
    seo: { description: { es: 'Descripción.', en: 'Description.' } },
  });

  it('por defecto, la descripción SEO en el idioma pedido', () => {
    expect(pageBlurb(described, 'en', { defaultLocale: 'es' })).toBe('Description.');
  });

  it('prefiere `index.summary` solo cuando se pide', () => {
    expect(pageBlurb(described, 'es', { defaultLocale: 'es', preferSummary: true })).toBe(
      'Resumen propio.',
    );
    expect(
      pageBlurb(page('b'), 'es', { defaultLocale: 'es', preferSummary: true }),
    ).toBeUndefined();
  });

  it('sin página o sin texto, nada', () => {
    expect(pageBlurb(undefined, 'es', { defaultLocale: 'es' })).toBeUndefined();
    expect(
      pageBlurb(page('c', 'es', { seo: { description: '' } }), 'es', { defaultLocale: 'es' }),
    ).toBeUndefined();
  });
});
