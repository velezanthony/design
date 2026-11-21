import { describe, expect, it } from 'vitest';

import type { NavTreeNode } from '../../../core/navigation/nav-tree';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import NavTree from './NavTree.astro';

const nodes: NavTreeNode[] = [
  {
    label: 'Astro',
    items: [
      {
        label: 'Vite',
        href: '/vite/',
        description: 'El framework.',
        items: [{ label: 'Plugins', href: '/plugins/', description: 'Qué son.' }],
      },
      { label: 'Tipado', href: '/tipado/' },
    ],
  },
  {
    label: 'Instalación',
    href: '/instalacion/',
    badge: 'en',
    description: 'Qué necesitas y cómo instalarlo.',
  },
];

function tree(extra: Record<string, unknown> = {}) {
  return render(NavTree, { nodes, descriptions: true, strings: stringsFor('es'), ...extra });
}

describe('NavTree', () => {
  it('pinta los grupos como listas anidadas con la etiqueta en negrita', async () => {
    const document = await tree();
    const root = document.querySelector('ul.docs-nav-tree')!;
    const astro = root.querySelector(':scope > li')!;
    expect(astro.querySelector(':scope > strong')!.textContent).toBe('Astro');
    const vite = astro.querySelector(':scope > ul > li')!;
    expect(vite.querySelector(':scope > strong > a')!.getAttribute('href')).toBe('/vite/');
    expect(vite.querySelector(':scope > ul > li > a')!.getAttribute('href')).toBe('/plugins/');
  });

  it('cada página es un enlace con su título y, detrás, su descripción', async () => {
    const document = await tree();
    const plugins = document.querySelector('a[href="/plugins/"]')!.parentElement!;
    expect(text(plugins)).toBe('Plugins — Qué son.');
    expect(text(document.querySelector('a[href="/tipado/"]')!.parentElement)).toBe('Tipado');
  });

  it('con `descriptions` a false solo quedan los títulos', async () => {
    const document = await tree({ descriptions: false });
    expect(text(document)).not.toContain('Qué son.');
    expect(text(document)).not.toContain('—');
  });

  it('un enlace al original de otro idioma lleva su insignia, como en la barra lateral', async () => {
    const document = await tree();
    const install = document.querySelector('a[href="/instalacion/"]')!;
    expect(install.getAttribute('hreflang')).toBe('en');
    expect(install.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(
      'Disponible en English',
    );
  });

  it('sin nodos no pinta nada', async () => {
    const document = await tree({ nodes: [] });
    expect(document.querySelector('ul')).toBeNull();
  });
});
