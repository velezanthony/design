import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import { sectionIndexOf, sectionOwns, slugInDir, validateNav } from './nav-sections';

const nav: NavItem[] = [
  { label: 'Guide', dir: 'users' },
  { label: 'Changelog', slug: 'changelog' },
  { label: 'Contributing', dir: 'contributors' },
  { label: 'Code', href: 'https://github.com/x/y' },
];
const slugs = new Set([
  '',
  'showcase',
  'changelog',
  'users/install',
  'users/guide/a',
  'contributors',
  'contributors/testing',
  'users-extra',
]);

describe('slugInDir', () => {
  it('es el propio dir o cuelga de él, nunca un prefijo de texto', () => {
    expect(slugInDir('users', 'users')).toBe(true);
    expect(slugInDir('users', 'users/guide/a')).toBe(true);
    expect(slugInDir('users', 'users-extra')).toBe(false);
    expect(slugInDir('users', '')).toBe(false);
  });
});

describe('sectionIndexOf', () => {
  it('devuelve la posición en `nav` de la sección a la que pertenece la página', () => {
    expect(sectionIndexOf(nav, 'users/install')).toBe(0);
    expect(sectionIndexOf(nav, 'contributors')).toBe(2);
    expect(sectionIndexOf(nav, 'contributors/testing')).toBe(2);
  });

  it('la portada, una página suelta y las ajenas no tienen sección', () => {
    expect(sectionIndexOf(nav, '')).toBe(-1);
    expect(sectionIndexOf(nav, 'changelog')).toBe(-1);
    expect(sectionIndexOf(nav, 'users-extra')).toBe(-1);
  });

  it('sin `nav` nada pertenece a una sección', () => {
    expect(sectionIndexOf(undefined, 'users/install')).toBe(-1);
  });
});

describe('sectionOwns', () => {
  it('una sección con dir se queda con su carpeta', () => {
    expect(sectionOwns({ label: 'G', dir: 'users' }, 'users/install')).toBe(true);
    expect(sectionOwns({ label: 'G', dir: 'users' }, 'changelog')).toBe(false);
  });

  it('lo que nombra su sidebar es suyo aunque viva fuera del dir', () => {
    const section = {
      label: 'G',
      dir: 'users',
      sidebar: ['users/install', { label: 'Más', items: ['changelog'] }, 'index'],
    };
    expect(sectionOwns(section, 'changelog')).toBe(true);
    expect(sectionOwns(section, '')).toBe(true);
    expect(sectionOwns(section, 'showcase')).toBe(false);
  });

  it('sin dir solo cuenta el sidebar', () => {
    expect(sectionOwns({ label: 'G', sidebar: ['changelog'] }, 'changelog')).toBe(true);
    expect(sectionOwns({ label: 'G', sidebar: ['changelog'] }, 'users/install')).toBe(false);
  });
});

describe('sectionIndexOf: páginas sueltas en una sección', () => {
  it('una página de fuera del dir pertenece a la sección que la nombra', () => {
    const items: NavItem[] = [
      { label: 'G', dir: 'users', sidebar: ['users/install', 'changelog'] },
    ];
    expect(sectionIndexOf(items, 'changelog')).toBe(0);
  });
});

function messages(items: NavItem[]) {
  return validateNav(items, slugs).map((error) => error.message);
}

describe('validateNav', () => {
  it('una config coherente no da errores', () => {
    expect(messages([...nav, { label: 'S', dir: 'showcase', sidebar: ['showcase'] }])).toEqual([]);
  });

  it('un dir sin páginas falla con su ruta', () => {
    const [message, ...rest] = messages([{ label: 'X', dir: 'nope' }, ...nav]);
    expect(rest).toEqual([]);
    expect(message).toContain('nav[0].dir');
    expect(message).toContain('nope');
  });

  it('un slug de página que no existe falla con su ruta', () => {
    expect(messages([{ label: 'X', slug: 'ghost' }])[0]).toContain('nav[0].slug');
  });

  it('una página suelta no puede vivir dentro de una sección', () => {
    const out = messages([
      { label: 'G', dir: 'users' },
      { label: 'P', slug: 'users/install' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('nav[1].slug');
    expect(out[0]).toContain('users');
  });

  it('el slug `index` es la portada y es una página válida', () => {
    expect(messages([{ label: 'Home', slug: 'index' }])).toEqual([]);
  });

  it('el sidebar de una sección con slugs desconocidos falla con la ruta anidada', () => {
    const out = messages([
      {
        label: 'G',
        dir: 'users',
        sidebar: ['users/install', { label: 'L', items: ['users/ghost'] }],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('nav[0].sidebar[1].items[0]');
    expect(out[0]).toContain('users/ghost');
  });

  it('el sidebar de una sección admite páginas de fuera del dir', () => {
    expect(
      messages([{ label: 'G', dir: 'users', sidebar: ['users/install', 'changelog', 'index'] }]),
    ).toEqual([]);
  });

  it('una sección solo con sidebar es válida si sus páginas existen', () => {
    expect(messages([{ label: 'G', sidebar: ['changelog', 'showcase'] }])).toEqual([]);
    expect(messages([{ label: 'G', sidebar: ['ghost'] }])[0]).toContain('nav[0].sidebar[0]');
  });

  it('una página en el sidebar de dos secciones falla en la segunda', () => {
    const out = messages([
      { label: 'A', dir: 'users', sidebar: ['changelog'] },
      { label: 'B', dir: 'contributors', sidebar: ['changelog'] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('nav[1].sidebar[0]');
    expect(out[0]).toContain('nav[0]');
  });

  it('una página en el sidebar de una sección ya no puede ir suelta en el nav', () => {
    const out = messages([
      { label: 'A', dir: 'users', sidebar: ['changelog'] },
      { label: 'P', slug: 'changelog' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('nav[1].slug');
  });

  it('un slug vacío en el sidebar de una sección falla aunque la portada exista', () => {
    const out = messages([{ label: 'G', dir: 'users', sidebar: ['users/install', ''] }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('nav[0].sidebar[1]');
    expect(out[0]).toContain('no hay ninguna página');
  });

  it('cada error lleva una pista para arreglarlo', () => {
    const out = validateNav(
      [
        { label: 'A', dir: 'nope' },
        { label: 'B', slug: 'ghost' },
        { label: 'P', slug: 'users/install' },
        { label: 'G', dir: 'users', sidebar: ['ghost', 'changelog'] },
      ],
      slugs,
    );
    // `changelog` fuera de `users` ya no es error: el sidebar de una sección admite páginas sueltas.
    expect(out).toHaveLength(4);
    for (const error of out) expect(error.hint, error.message).toBeTruthy();
  });

  it('agrega todos los fallos en una sola pasada', () => {
    const out = messages([
      { label: 'A', dir: 'nope' },
      { label: 'B', slug: 'ghost' },
      { label: 'C', dir: 'users', sidebar: ['users/ghost'] },
    ]);
    expect(out).toHaveLength(3);
  });
});
