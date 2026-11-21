import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import {
  buildIndexListing,
  coverFor,
  coverPattern,
  formatIndexDate,
  isIndexGroup,
  pageCount,
  pageSlice,
  sortByUpdated,
  type EntryDetails,
  type IndexEntry,
} from './index-entries';
import type { NavContext } from './nav-entries';

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

/* El blog del portfolio: artículos planos en `articulos/`, el árbol lo forman los `sidebar`. */
const pages = [
  page('articulos', 'es', { index: { layout: 'cards' } }),
  page('articulos/django', 'es', { seo: { description: 'Consultas N+1.' } }),
  page('articulos/django', 'en', { seo: { description: 'N+1 queries.' } }),
  page('articulos/git', 'es', {
    index: { summary: 'Resumen propio.' },
    seo: { description: 'Descripción SEO.' },
  }),
  page('articulos/docker'),
  page('articulos/suelto'),
  page('guia/intro'),
];

const nav: NavItem[] = [
  {
    label: { es: 'Desarrollo', en: 'Development' },
    sidebar: [
      { label: { es: 'Herramientas', en: 'Tools' }, items: ['articulos/git'] },
      { label: 'Python', items: [{ label: 'Django', items: ['articulos/django'] }] },
    ],
  },
  { label: 'GitHub', href: 'https://github.com/x/y' },
  {
    label: { es: 'Sistemas', en: 'Systems' },
    sidebar: [{ label: { es: 'Contenedores', en: 'Containers' }, items: ['articulos/docker'] }],
  },
];

function context(locale = 'es', extra: Partial<NavContext['config']> = {}): NavContext {
  return {
    pages,
    availability: buildAvailability(pages, url),
    locale,
    config: { locales: ['es', 'en'], defaultLocale: 'es', nav, sidebar: ['articulos'], ...extra },
    policies: resolvePolicies(pages, MissingTranslation.FALLBACK).policies,
    url,
    slug: 'articulos',
  };
}

function none() {
  return undefined;
}

function titles(entries: IndexEntry[]) {
  return entries.map((entry) => entry.title);
}

describe('buildIndexListing: entradas', () => {
  it('las páginas de la carpeta que están en la navegación, en el orden del árbol', () => {
    const { entries } = buildIndexListing(context(), 'es', 'articulos', none);
    expect(titles(entries)).toEqual(['git (es)', 'django (es)', 'docker (es)', 'suelto (es)']);
    expect(entries.map((entry) => entry.href)).toEqual([
      '/repo/articulos/git/',
      '/repo/articulos/django/',
      '/repo/articulos/docker/',
      '/repo/articulos/suelto/',
    ]);
  });

  it('el camino es la sección y cada grupo; lo que no está en ninguna sección no lleva', () => {
    const { entries } = buildIndexListing(context(), 'es', 'articulos', none);
    expect(entries.map((entry) => entry.path)).toEqual([
      ['Desarrollo', 'Herramientas'],
      ['Desarrollo', 'Python', 'Django'],
      ['Sistemas', 'Contenedores'],
      [],
    ]);
  });

  it('el resumen es `index.summary` y, sin él, `seo.description`', () => {
    const { entries } = buildIndexListing(context(), 'es', 'articulos', none);
    expect(entries.map((entry) => entry.summary)).toEqual([
      'Resumen propio.',
      'Consultas N+1.',
      undefined,
      undefined,
    ]);
  });

  it('en inglés: URLs de la ruta y textos del contenido inglés si la traducción existe', () => {
    const { entries } = buildIndexListing(context('en'), 'en', 'articulos', none);
    const django = entries.find((entry) => entry.slug === 'articulos/django')!;
    expect(django).toMatchObject({
      title: 'django (en)',
      href: '/repo/en/articulos/django/',
      summary: 'N+1 queries.',
      path: ['Development', 'Python', 'Django'],
    });
    // Sin traducción: el texto del original bajo la URL de reserva.
    const git = entries.find((entry) => entry.slug === 'articulos/git')!;
    expect(git).toMatchObject({ title: 'git (es)', href: '/repo/en/articulos/git/' });
  });

  it('la fecha y la portada vienen de los detalles de cada página', () => {
    function details(slug: string): EntryDetails | undefined {
      return slug === 'articulos/git'
        ? { updated: '2026-01-02T00:00:00+00:00', cover: { src: '/git.png' }, imageAlt: 'Git' }
        : undefined;
    }
    const { entries } = buildIndexListing(context(), 'es', 'articulos', details);
    expect(entries[0]).toMatchObject({
      updated: '2026-01-02T00:00:00+00:00',
      cover: { src: '/git.png' },
      imageAlt: 'Git',
    });
    expect(entries[1]!.updated).toBeUndefined();
  });

  it('sin `nav`: el árbol de la barra lateral, sin el grupo de la propia carpeta', () => {
    const { entries, sections } = buildIndexListing(
      context('es', { nav: undefined, sidebar: undefined }),
      'es',
      'articulos',
      none,
    );
    expect(titles(entries)).toEqual(['django (es)', 'docker (es)', 'git (es)', 'suelto (es)']);
    expect(entries.every((entry) => entry.path.length === 0)).toBe(true);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.label).toBeUndefined();
  });

  it('una carpeta sin páginas en la navegación da un listado vacío', () => {
    expect(buildIndexListing(context(), 'es', 'nada', none)).toEqual({
      sections: [],
      entries: [],
    });
  });
});

describe('buildIndexListing: secciones (disposición lista)', () => {
  it('una por sección de `nav` con entradas, con su etiqueta y un id', () => {
    const { sections } = buildIndexListing(context(), 'es', 'articulos', none);
    expect(sections.map((section) => [section.label, section.id])).toEqual([
      ['Desarrollo', 'desarrollo'],
      ['Sistemas', 'sistemas'],
      [undefined, undefined],
    ]);
  });

  it('los grupos anidados conservan su etiqueta y sus entradas', () => {
    const { sections } = buildIndexListing(context(), 'es', 'articulos', none);
    const [tools, python] = sections[0]!.nodes;
    expect(isIndexGroup(tools!) && tools.label).toBe('Herramientas');
    expect(
      isIndexGroup(python!) &&
        python.items.map((node) => (isIndexGroup(node) ? node.label : node.title)),
    ).toEqual(['Django']);
  });

  it('un id que ya existe en la página se desambigua', () => {
    const { sections } = buildIndexListing(context(), 'es', 'articulos', none, ['desarrollo']);
    expect(sections[0]!.id).toBe('desarrollo-1');
  });
});

describe('sortByUpdated', () => {
  function entry(title: string, updated?: string) {
    return { title, ...(updated && { updated }) };
  }

  it('lo más reciente primero y lo que no tiene commit (sin publicar) delante, en su orden', () => {
    const sorted = sortByUpdated([
      entry('viejo', '2025-01-01T00:00:00+00:00'),
      entry('borrador 1'),
      entry('nuevo', '2026-05-01T00:00:00+00:00'),
      entry('borrador 2'),
    ]);
    expect(sorted.map((item) => item.title)).toEqual([
      'borrador 1',
      'borrador 2',
      'nuevo',
      'viejo',
    ]);
  });

  it('no muta la lista', () => {
    const list = [entry('a', '2025-01-01'), entry('b', '2026-01-01')];
    sortByUpdated(list);
    expect(list[0]!.title).toBe('a');
  });
});

describe('paginación', () => {
  it('pageCount: al menos una página', () => {
    expect(pageCount(0, 12)).toBe(1);
    expect(pageCount(12, 12)).toBe(1);
    expect(pageCount(13, 12)).toBe(2);
  });

  it('pageSlice: la página pedida', () => {
    expect(pageSlice([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(pageSlice([1, 2, 3, 4, 5], 3, 2)).toEqual([5]);
  });
});

describe('coverFor', () => {
  it('una imagen real se muestra con su alt, decorativa (vacío) si no lo trae', () => {
    expect(coverFor({ src: '/a.png' }, false, 'Un gato')).toEqual({
      kind: 'image',
      source: { src: '/a.png' },
      alt: 'Un gato',
    });
    expect(coverFor({ src: '/a.png' }, true)).toMatchObject({ kind: 'image', alt: '' });
  });

  it('`false` en la página: sin imagen aunque la carpeta pida portadas', () => {
    expect(coverFor(false, true)).toEqual({ kind: 'none' });
  });

  it('una imagen que falta: la de la librería aunque la política diga que no', () => {
    expect(coverFor('missing', false)).toEqual({ kind: 'placeholder' });
  });

  it('sin nada en la página manda la política de la carpeta', () => {
    expect(coverFor(undefined, true)).toEqual({ kind: 'placeholder' });
    expect(coverFor(undefined, false)).toEqual({ kind: 'none' });
  });
});

describe('coverPattern', () => {
  it('estable por slug y entre los tres dibujos', () => {
    expect(coverPattern('articulos/git')).toBe(coverPattern('articulos/git'));
    const patterns = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(coverPattern));
    expect([...patterns].every((pattern) => ['grid', 'diagonal', 'dots'].includes(pattern))).toBe(
      true,
    );
    expect(patterns.size).toBeGreaterThan(1);
  });
});

describe('formatIndexDate', () => {
  it('fecha media en el idioma, en UTC', () => {
    expect(formatIndexDate('2026-11-21T23:30:00+00:00', 'es')).toBe('21 nov 2026');
    expect(formatIndexDate('2026-11-21T23:30:00+00:00', 'en')).toBe('Nov 21, 2026');
  });
});
