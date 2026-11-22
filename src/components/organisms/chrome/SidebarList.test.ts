import { describe, expect, it } from 'vitest';

import type { SidebarNode } from '../../../core/navigation/sidebar';
import { render } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import SidebarList from './SidebarList.astro';

/* Una etiqueta de grupo con página índice en su carpeta es un enlace; sin ella, texto. Plegar y navegar
   no se mezclan: si un grupo se hace plegable, el control irá aparte, nunca envolviendo el enlace. */
const nodes: SidebarNode[] = [
  {
    label: 'Sistemas',
    slug: 'articulos/sistemas',
    href: '/articulos/sistemas/',
    items: [
      { label: 'Docker', slug: 'articulos/sistemas/docker', href: '/articulos/sistemas/docker/' },
    ],
  },
  {
    label: 'Cloud',
    items: [{ label: 'AWS', slug: 'articulos/cloud/aws', href: '/articulos/cloud/aws/' }],
  },
];

function list(current = '/articulos/sistemas/docker/') {
  return render(SidebarList, { nodes, current, strings: stringsFor('es'), root: true });
}

function groupLink(document: Document) {
  return document.querySelector('a[href="/articulos/sistemas/"]')!;
}

describe('SidebarList: etiqueta de grupo', () => {
  it('un grupo con `href` es un enlace con la clase de grupo (seminegrita)', async () => {
    const link = groupLink(await list());
    expect(link.tagName).toBe('A');
    expect(link.textContent).toContain('Sistemas');
    expect(link.getAttribute('class')).toContain('font-semibold');
  });

  it('lleva aria-current="page" cuando es la página actual, y solo entonces', async () => {
    expect(groupLink(await list('/articulos/sistemas/')).getAttribute('aria-current')).toBe('page');
    expect(groupLink(await list()).hasAttribute('aria-current')).toBe(false);
  });

  it('sin `href`, la etiqueta es un <span>, no un enlace', async () => {
    const document = await list();
    const cloud = [...document.querySelectorAll('span')].find(
      (span) => span.textContent === 'Cloud',
    );
    expect(cloud).toBeDefined();
    expect(cloud!.closest('a')).toBeNull();
  });

  it('el enlace del grupo no está dentro de ningún control de plegado ni lleva aria-expanded', async () => {
    const link = groupLink(await list());
    expect(link.closest('summary')).toBeNull();
    expect(link.closest('button')).toBeNull();
    expect(link.closest('details')).toBeNull();
    expect(link.hasAttribute('aria-expanded')).toBe(false);
  });
});
