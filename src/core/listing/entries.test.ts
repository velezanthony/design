import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import type { NavContext } from '../navigation/nav-sidebar';
import {
  buildListing,
  isListingGroup,
  sortByUpdated,
  type EntryDetails,
  type ListingEntry,
} from './entries';

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

/* Un sitio de tutoriales: páginas planas en `tutoriales/`, el árbol lo forman los `sidebar`. */
const pages = [
  page('tutoriales', 'es', { sourcePath: 'tutoriales/_index.md' }),
  page('tutoriales/configuracion', 'es', {
    seo: { description: 'Las opciones del archivo de configuración.' },
  }),
  page('tutoriales/configuracion', 'en', {
    seo: { description: 'The options in the config file.' },
  }),
  page('tutoriales/instalacion', 'es', {
    index: { summary: 'Resumen propio.' },
    seo: { description: 'Descripción SEO.' },
  }),
  page('tutoriales/despliegue'),
  page('tutoriales/suelto'),
  page('guia/intro'),
];

const nav: NavItem[] = [
  {
    label: { es: 'Esenciales', en: 'Essentials' },
    sidebar: [
      { label: { es: 'Primeros pasos', en: 'Getting started' }, items: ['tutoriales/instalacion'] },
      { label: 'Astro', items: [{ label: 'Vite', items: ['tutoriales/configuracion'] }] },
    ],
  },
  { label: 'GitHub', href: 'https://github.com/x/y' },
  {
    label: { es: 'Avanzado', en: 'Advanced' },
    sidebar: [{ label: { es: 'Despliegue', en: 'Deployment' }, items: ['tutoriales/despliegue'] }],
  },
];

function context(locale = 'es', extra: Partial<NavContext['config']> = {}): NavContext {
  return {
    pages,
    availability: buildAvailability(pages, url),
    locale,
    config: {
      i18n: { locales: ['es', 'en'], defaultLocale: 'es', ...extra.i18n },
      content: { nav, sidebar: ['tutoriales'], ...extra.content },
    },
    policies: resolvePolicies(pages, MissingTranslation.FALLBACK).policies,
    url,
    slug: 'tutoriales',
  };
}

function none() {
  return undefined;
}

function titles(entries: ListingEntry[]) {
  return entries.map((entry) => entry.title);
}

describe('buildListing: entradas', () => {
  it('las páginas de la carpeta que están en la navegación, en el orden del árbol', () => {
    const { entries } = buildListing({
      context: context(),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    expect(titles(entries)).toEqual([
      'instalacion (es)',
      'configuracion (es)',
      'despliegue (es)',
      'suelto (es)',
    ]);
    expect(entries.map((entry) => entry.href)).toEqual([
      '/repo/tutoriales/instalacion/',
      '/repo/tutoriales/configuracion/',
      '/repo/tutoriales/despliegue/',
      '/repo/tutoriales/suelto/',
    ]);
  });

  it('el camino es la sección y cada grupo; lo que no está en ninguna sección no lleva', () => {
    const { entries } = buildListing({
      context: context(),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    expect(entries.map((entry) => entry.path)).toEqual([
      ['Esenciales', 'Primeros pasos'],
      ['Esenciales', 'Astro', 'Vite'],
      ['Avanzado', 'Despliegue'],
      [],
    ]);
  });

  it('el resumen es `index.summary` y, sin él, `seo.description`', () => {
    const { entries } = buildListing({
      context: context(),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    expect(entries.map((entry) => entry.summary)).toEqual([
      'Resumen propio.',
      'Las opciones del archivo de configuración.',
      undefined,
      undefined,
    ]);
  });

  it('en inglés: URLs de la ruta y textos del contenido inglés si la traducción existe', () => {
    const { entries } = buildListing({
      context: context('en'),
      contentLocale: 'en',
      folder: 'tutoriales',
      details: none,
    });
    const configuration = entries.find((entry) => entry.slug === 'tutoriales/configuracion')!;
    expect(configuration).toMatchObject({
      title: 'configuracion (en)',
      href: '/repo/en/tutoriales/configuracion/',
      summary: 'The options in the config file.',
      path: ['Essentials', 'Astro', 'Vite'],
    });
    // Sin traducción: el texto del original bajo la URL de reserva.
    const install = entries.find((entry) => entry.slug === 'tutoriales/instalacion')!;
    expect(install).toMatchObject({
      title: 'instalacion (es)',
      href: '/repo/en/tutoriales/instalacion/',
    });
  });

  it('la fecha y la portada vienen de los detalles de cada página', () => {
    function details(slug: string): EntryDetails | undefined {
      return slug === 'tutoriales/instalacion'
        ? {
            updated: '2026-01-02T00:00:00+00:00',
            cover: { src: '/instalacion.png' },
            imageAlt: 'Terminal con la instalación',
          }
        : undefined;
    }
    const { entries } = buildListing({
      context: context(),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: details,
    });
    expect(entries[0]).toMatchObject({
      updated: '2026-01-02T00:00:00+00:00',
      cover: { src: '/instalacion.png' },
      imageAlt: 'Terminal con la instalación',
    });
    expect(entries[1]!.updated).toBeUndefined();
  });

  it('sin `nav`: el árbol de la barra lateral, sin el grupo de la propia carpeta', () => {
    const { entries, sections } = buildListing({
      context: context('es', { content: { nav: undefined, sidebar: undefined } }),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    expect(titles(entries)).toEqual([
      'configuracion (es)',
      'despliegue (es)',
      'instalacion (es)',
      'suelto (es)',
    ]);
    expect(entries.every((entry) => entry.path.length === 0)).toBe(true);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.label).toBeUndefined();
  });

  it('un `index.md` que da otro título al grupo de la carpeta no añade ese grupo al camino', () => {
    const renamed = pages.map((item) =>
      item.slug === 'tutoriales' ? { ...item, title: 'Todo sobre tutoriales' } : item,
    );
    const { entries } = buildListing({
      context: {
        ...context('es', { content: { nav: undefined, sidebar: undefined } }),
        pages: renamed,
      },
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.path.length === 0)).toBe(true);
  });

  it('un grupo de `sidebar` con la etiqueta humanizada de la carpeta sí cuenta en el camino', () => {
    // Dos grupos que no se envuelven comparten la carpeta: ninguno es su dueño, así que son grupos
    // normales aunque uno se llame como ella.
    const { entries } = buildListing({
      context: context('es', {
        content: {
          nav: undefined,
          sidebar: [
            { label: 'Tutoriales', items: ['tutoriales/instalacion'] },
            { label: 'Otros', items: ['tutoriales/despliegue'] },
          ],
        },
      }),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    function pathOf(slug: string) {
      return entries.find((entry) => entry.slug === slug)?.path;
    }
    expect(pathOf('tutoriales/instalacion')).toEqual(['Tutoriales']);
    expect(pathOf('tutoriales/despliegue')).toEqual(['Otros']);
    expect(pathOf('tutoriales/suelto')).toEqual([]);
  });

  it('un grupo de `sidebar` dueño de la carpeta del listado la enlaza y no añade nada al camino', () => {
    const { entries } = buildListing({
      context: context('es', {
        content: {
          nav: undefined,
          sidebar: [
            { label: 'Tutoriales', items: ['tutoriales/instalacion', 'tutoriales/despliegue'] },
          ],
        },
      }),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    expect(entries.every((entry) => entry.path.length === 0)).toBe(true);
  });

  it('cada carpeta por debajo de la del listado añade su grupo al camino, a cualquier profundidad', () => {
    const deep = [page('blog/a/y'), page('blog/a/b/c/x'), page('blog/a/b/z')];
    const { entries } = buildListing({
      context: {
        ...context('es', { content: { nav: undefined, sidebar: undefined } }),
        pages: deep,
        availability: buildAvailability(deep, url),
        policies: resolvePolicies(deep, MissingTranslation.FALLBACK).policies,
      },
      contentLocale: 'es',
      folder: 'blog/a',
      details: none,
    });
    expect(entries.map((entry) => [entry.slug, entry.path])).toEqual([
      // `Blog` es un grupo antepasado de la carpeta: cuenta, como cualquier grupo por encima.
      ['blog/a/b/c/x', ['Blog', 'B', 'C']],
      ['blog/a/b/z', ['Blog', 'B']],
      ['blog/a/y', ['Blog']],
    ]);
  });

  it('una página generada de una subcarpeta no es una entrada, pero su grupo la enlaza', () => {
    const deep = [
      page('blog/a/x'),
      page('blog/a', 'es', {
        kind: 'generated',
        title: 'Carpeta A',
        sourcePath: 'blog/a/_index.md',
      }),
      page('blog/y'),
    ];
    const { entries, sections } = buildListing({
      context: {
        ...context('es', { content: { nav: undefined, sidebar: undefined } }),
        pages: deep,
        availability: buildAvailability(deep, url),
        policies: resolvePolicies(deep, MissingTranslation.FALLBACK).policies,
      },
      contentLocale: 'es',
      folder: 'blog',
      details: none,
    });
    expect(entries.map((entry) => entry.slug)).toEqual(['blog/a/x', 'blog/y']);
    const group = sections[0]!.nodes.find(isListingGroup);
    expect(group).toMatchObject({ label: 'Carpeta A', href: '/repo/blog/a/' });
  });

  it('una carpeta sin páginas en la navegación da un listado vacío', () => {
    expect(
      buildListing({ context: context(), contentLocale: 'es', folder: 'nada', details: none }),
    ).toEqual({
      sections: [],
      entries: [],
    });
  });
});

describe('buildListing: secciones (disposición lista)', () => {
  it('una por sección de `nav` con entradas, con su etiqueta y un id', () => {
    const { sections } = buildListing({
      context: context(),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    expect(sections.map((section) => [section.label, section.id])).toEqual([
      ['Esenciales', 'esenciales'],
      ['Avanzado', 'avanzado'],
      [undefined, undefined],
    ]);
  });

  it('los grupos anidados conservan su etiqueta y sus entradas', () => {
    const { sections } = buildListing({
      context: context(),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
    });
    const [gettingStarted, astro] = sections[0]!.nodes;
    expect(isListingGroup(gettingStarted!) && gettingStarted.label).toBe('Primeros pasos');
    expect(
      isListingGroup(astro!) &&
        astro.items.map((node) => (isListingGroup(node) ? node.label : node.title)),
    ).toEqual(['Vite']);
  });

  it('un id que ya existe en la página se desambigua', () => {
    const { sections } = buildListing({
      context: context(),
      contentLocale: 'es',
      folder: 'tutoriales',
      details: none,
      takenIds: ['esenciales'],
    });
    expect(sections[0]!.id).toBe('esenciales-1');
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
