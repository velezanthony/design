import { describe, expect, it } from 'vitest';

import type { CoverView } from '../../../core/listing/covers';
import type { ListingItem } from '../../../core/listing/view';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import ListingCard from './ListingCard.astro';

const base: ListingItem<CoverView> = {
  slug: 'tutoriales/instalacion',
  title: 'Instalación',
  href: '/repo/tutoriales/instalacion/',
  summary: 'Qué necesitas.',
  updated: { iso: '2026-11-21T10:00:00+00:00', label: '21 nov 2026' },
  pattern: 'grid',
  path: ['Esenciales', 'Primeros pasos'],
  cover: { kind: 'image', src: '/repo/_astro/instalacion.webp', alt: 'Terminal' },
};

async function card(item: Partial<ListingItem<CoverView>> = {}) {
  const document = await render(ListingCard, {
    item: { ...base, ...item },
    strings: stringsFor('es'),
  });
  return document.querySelector('[data-listing-card]')!;
}

describe('ListingCard', () => {
  it('portada `image`: la imagen encima de la portada de la librería', async () => {
    const element = await card();
    const cover = element.querySelector('[data-listing-cover]')!;
    expect(cover.querySelector('[data-cover-placeholder]')).not.toBeNull();
    expect(cover.querySelector('img')!.getAttribute('alt')).toBe('Terminal');
  });

  it('el dibujo de la portada de la librería es el que elige el modelo', async () => {
    const element = await card({ cover: { kind: 'placeholder' }, pattern: 'dots' });
    expect(element.querySelector('[data-cover-placeholder]')!.getAttribute('data-pattern')).toBe(
      'dots',
    );
  });

  it('portada `placeholder`: solo el dibujo', async () => {
    const cover = (await card({ cover: { kind: 'placeholder' } })).querySelector(
      '[data-listing-cover]',
    )!;
    expect(cover.querySelector('[data-cover-placeholder]')).not.toBeNull();
    expect(cover.querySelector('img')).toBeNull();
  });

  it('portada `none`: sin caja de portada', async () => {
    expect(
      (await card({ cover: { kind: 'none' } })).querySelector('[data-listing-cover]'),
    ).toBeNull();
  });

  it('sin camino ni fecha no pinta SectionPath ni DateLabel', async () => {
    const element = await card({ path: [], updated: undefined });
    expect(element.querySelector('[data-listing-path]')).toBeNull();
    expect(element.querySelector('time')).toBeNull();
  });

  it('con camino y fecha: SectionPath y DateLabel con la etiqueta del modelo', async () => {
    const element = await card();
    expect(text(element.querySelector('[data-listing-path]'))).toBe('Esenciales › Primeros pasos');
    expect(text(element.querySelector('time'))).toBe('21 nov 2026');
  });

  it('el título es un h2 (Heading `md`) con el enlace estirado a toda la tarjeta', async () => {
    const heading = (await card()).querySelector('h2')!;
    for (const name of ['text-lg', 'font-semibold', 'leading-snug']) {
      expect(heading.classList.contains(name)).toBe(true);
    }
    const link = heading.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/repo/tutoriales/instalacion/');
    expect(link.classList.contains('after:inset-0')).toBe(true);
  });

  it('el resumen es un Text `sm` recortado a tres líneas', async () => {
    const summary = (await card()).querySelector('p.line-clamp-3')!;
    expect(text(summary)).toBe('Qué necesitas.');
    expect(summary.classList.contains('text-sm')).toBe(true);
  });
});
