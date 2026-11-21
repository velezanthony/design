import { describe, expect, it } from 'vitest';

import type { NavTreeNode } from '../../../core/navigation/nav-tree';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import NavTree from './NavTree.astro';

const nodes: NavTreeNode[] = [
  {
    label: 'Python',
    items: [
      {
        label: 'Django',
        href: '/django/',
        description: 'El framework.',
        items: [{ label: 'Consultas N+1', href: '/n1/', description: 'Qué son.' }],
      },
      { label: 'Tipado', href: '/tipado/' },
    ],
  },
  { label: 'Git', href: '/git/', badge: 'en', description: 'Deshacer errores.' },
];

function tree(extra: Record<string, unknown> = {}) {
  return render(NavTree, { nodes, descriptions: true, strings: stringsFor('es'), ...extra });
}

describe('NavTree', () => {
  it('pinta los grupos como listas anidadas con la etiqueta en negrita', async () => {
    const document = await tree();
    const root = document.querySelector('ul.docs-nav-tree')!;
    const python = root.querySelector(':scope > li')!;
    expect(python.querySelector(':scope > strong')!.textContent).toBe('Python');
    const django = python.querySelector(':scope > ul > li')!;
    expect(django.querySelector(':scope > strong > a')!.getAttribute('href')).toBe('/django/');
    expect(django.querySelector(':scope > ul > li > a')!.getAttribute('href')).toBe('/n1/');
  });

  it('cada página es un enlace con su título y, detrás, su descripción', async () => {
    const document = await tree();
    const n1 = document.querySelector('a[href="/n1/"]')!.parentElement!;
    expect(text(n1)).toBe('Consultas N+1 — Qué son.');
    expect(text(document.querySelector('a[href="/tipado/"]')!.parentElement)).toBe('Tipado');
  });

  it('con `descriptions` a false solo quedan los títulos', async () => {
    const document = await tree({ descriptions: false });
    expect(text(document)).not.toContain('Qué son.');
    expect(text(document)).not.toContain('—');
  });

  it('un enlace al original de otro idioma lleva su insignia, como en la barra lateral', async () => {
    const document = await tree();
    const git = document.querySelector('a[href="/git/"]')!;
    expect(git.getAttribute('hreflang')).toBe('en');
    expect(git.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(
      'Disponible en English',
    );
  });

  it('sin nodos no pinta nada', async () => {
    const document = await tree({ nodes: [] });
    expect(document.querySelector('ul')).toBeNull();
  });
});
