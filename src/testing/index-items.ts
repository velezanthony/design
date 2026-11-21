import type { CoverView, IndexItem } from '../core/navigation/index-entries';

/** Entradas de prueba de un índice: una sin publicar, una con imagen y otra sin portada. */
export const items: IndexItem<CoverView>[] = [
  {
    slug: 'articulos/dns',
    title: 'Cambiar de servidor sin caída',
    href: '/repo/articulos/dns/',
    summary: 'El TTL y el orden de los pasos.',
    path: ['Sistemas', 'Redes'],
    cover: { kind: 'placeholder' },
  },
  {
    slug: 'articulos/git',
    title: 'Deshacer errores en Git',
    href: '/repo/articulos/git/',
    summary: 'Restore, reset y reflog.',
    updated: '2026-11-21T10:00:00+00:00',
    path: ['Desarrollo', 'Herramientas'],
    cover: { kind: 'image', src: '/repo/_astro/git.webp', alt: '' },
  },
  {
    slug: 'articulos/aws',
    title: 'AWS básico',
    href: '/repo/en/articulos/aws/',
    badge: 'en',
    updated: '2026-01-05T10:00:00+00:00',
    path: [],
    cover: { kind: 'none' },
  },
];
