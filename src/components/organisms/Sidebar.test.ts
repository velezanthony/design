import { describe, expect, it } from 'vitest';

import type { SidebarNode } from '../../core/navigation/sidebar';
import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import Sidebar from './Sidebar.astro';

const nodes: SidebarNode[] = [
  { label: 'Inicio', href: '/repo/es/', slug: 'index' },
  {
    label: 'Guía',
    slug: 'guide',
    href: '/repo/es/guide/',
    items: [
      { label: 'Instalación', href: '/repo/es/guide/install/', slug: 'guide/install' },
      {
        label: 'Avanzado',
        slug: 'guide/advanced',
        items: [{ label: 'Plugins', href: '/repo/es/guide/advanced/plugins/', slug: 'x' }],
      },
    ],
  },
  { label: 'Changelog', href: '/repo/en/changelog/', slug: 'changelog', badge: 'en' },
];

function sidebar(props: Record<string, unknown> = {}) {
  return render(Sidebar, {
    nodes,
    current: '/repo/es/guide/install/',
    strings: stringsFor('es'),
    ...props,
  });
}

describe('Sidebar', () => {
  it('es una nav con nombre accesible localizado', async () => {
    const nav = (await sidebar()).querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Documentación');
    const en = (await sidebar({ strings: stringsFor('en') })).querySelector('nav')!;
    expect(en.getAttribute('aria-label')).toBe('Documentation');
  });

  it('marca solo la página actual con aria-current=page', async () => {
    const htmlDocument = await sidebar();
    const current = [...htmlDocument.querySelectorAll('[aria-current]')];
    expect(current).toHaveLength(1);
    expect(current[0]!.getAttribute('aria-current')).toBe('page');
    expect(current[0]!.getAttribute('href')).toBe('/repo/es/guide/install/');
  });

  it('la portada y la sección con índice también se marcan cuando son la página actual', async () => {
    const home = await sidebar({ current: '/repo/es/' });
    expect(home.querySelector('[aria-current]')!.getAttribute('href')).toBe('/repo/es/');
    const group = await sidebar({ current: '/repo/es/guide/' });
    expect(group.querySelector('[aria-current]')!.getAttribute('href')).toBe('/repo/es/guide/');
  });

  it('sin coincidencia no marca nada', async () => {
    expect((await sidebar({ current: '/otra/' })).querySelector('[aria-current]')).toBeNull();
  });

  it('pinta tres niveles anidados (sección, sección, hoja)', async () => {
    const htmlDocument = await sidebar();
    expect(htmlDocument.querySelector('nav > ul > li > ul > li > ul > li > a')).not.toBeNull();
    expect(text(htmlDocument.querySelector('nav > ul > li > ul > li > ul a'))).toBe('Plugins');
  });

  it('una sección sin índice muestra su etiqueta sin enlace', async () => {
    const htmlDocument = await sidebar();
    const label = [...htmlDocument.querySelectorAll('span, p')].find(
      (element) => text(element) === 'Avanzado',
    )!;
    expect(label.closest('a')).toBeNull();
  });

  it('una hoja link lleva insignia con hreflang/lang del original y nombre accesible', async () => {
    const link = (await sidebar()).querySelector('a[href="/repo/en/changelog/"]')!;
    expect(link.getAttribute('hreflang')).toBe('en');
    expect(link.getAttribute('lang')).toBe('en');
    const badge = link.querySelector('[aria-label]')!;
    expect(badge.getAttribute('aria-label')).toBe('Disponible en English');
    expect(text(badge)).toBe('en');
  });

  it('las hojas propias no llevan insignia ni hreflang', async () => {
    const link = (await sidebar()).querySelector('a[href="/repo/es/guide/install/"]')!;
    expect(link.hasAttribute('hreflang')).toBe(false);
    expect(link.querySelector('[aria-label]')).toBeNull();
  });

  it('el nombre de la insignia respeta un override y un idioma desconocido muestra su código', async () => {
    const htmlDocument = await sidebar({
      nodes: [{ label: 'X', href: '/x/', slug: 'x', badge: 'xx' }],
      strings: stringsFor('es', { 'translation.badgeLabel': 'Solo en {locale}' }),
    });
    expect(htmlDocument.querySelector('[aria-label]:not(nav)')!.getAttribute('aria-label')).toBe(
      'Solo en xx',
    );
  });

  it('sin nodos no pinta nada', async () => {
    expect((await sidebar({ nodes: [] })).querySelector('nav')).toBeNull();
  });
});
