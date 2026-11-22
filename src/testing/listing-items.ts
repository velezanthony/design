import type { CoverView } from '../core/listing/covers';
import type { ListingItem } from '../core/listing/view';

/** Entradas de prueba de un listado, ya como las da el modelo de vista: una sin publicar, una con imagen y otra sin portada. */
export const items: ListingItem<CoverView>[] = [
  {
    slug: 'tutoriales/despliegue',
    title: 'Desplegar sin caída',
    href: '/repo/tutoriales/despliegue/',
    summary: 'El orden de los pasos.',
    path: ['Avanzado', 'Despliegue'],
    cover: { kind: 'placeholder' },
    pattern: 'dots',
  },
  {
    slug: 'tutoriales/instalacion',
    title: 'Instalación',
    href: '/repo/tutoriales/instalacion/',
    summary: 'Qué necesitas y cómo instalarlo.',
    updated: { iso: '2026-11-21T10:00:00+00:00', label: '21 nov 2026' },
    path: ['Esenciales', 'Primeros pasos'],
    cover: { kind: 'image', src: '/repo/_astro/instalacion.webp', alt: '' },
    pattern: 'grid',
  },
  {
    slug: 'tutoriales/scripts',
    title: 'Scripts de la CLI',
    href: '/repo/en/tutoriales/scripts/',
    badge: 'en',
    updated: { iso: '2026-01-05T10:00:00+00:00', label: '5 ene 2026' },
    path: [],
    cover: { kind: 'none' },
    pattern: 'diagonal',
  },
];
