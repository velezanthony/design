import type { CoverView } from '../core/listing/covers';
import type { IndexItem } from '../core/listing/view';

/** Entradas de prueba de un índice: una sin publicar, una con imagen y otra sin portada. */
export const items: IndexItem<CoverView>[] = [
  {
    slug: 'tutoriales/despliegue',
    title: 'Desplegar sin caída',
    href: '/repo/tutoriales/despliegue/',
    summary: 'El orden de los pasos.',
    path: ['Avanzado', 'Despliegue'],
    cover: { kind: 'placeholder' },
  },
  {
    slug: 'tutoriales/instalacion',
    title: 'Instalación',
    href: '/repo/tutoriales/instalacion/',
    summary: 'Qué necesitas y cómo instalarlo.',
    updated: '2026-11-21T10:00:00+00:00',
    path: ['Esenciales', 'Primeros pasos'],
    cover: { kind: 'image', src: '/repo/_astro/instalacion.webp', alt: '' },
  },
  {
    slug: 'tutoriales/scripts',
    title: 'Scripts de la CLI',
    href: '/repo/en/tutoriales/scripts/',
    badge: 'en',
    updated: '2026-01-05T10:00:00+00:00',
    path: [],
    cover: { kind: 'none' },
  },
];
