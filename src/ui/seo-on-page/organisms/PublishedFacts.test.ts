import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import PublishedFacts from './PublishedFacts.astro';

const published = {
  title: 'Guide | Site',
  titleLength: 12,
  titleMin: 15,
  titleMax: 60,
  titlePx: 190,
  titleMaxPx: 580,
  description: 'A description of the guide.',
  descriptionSource: 'site',
  descriptionLength: 27,
  descriptionMin: 70,
  descriptionMax: 160,
  descriptionPx: 120,
  descriptionMaxPx: 920,
  canonical: '/repo/guide/',
  noindex: false,
  sourcePath: 'guide.md',
};
const previews = {
  serp: {
    title: 'Guide | Site',
    url: 'https://x.dev/repo/guide/',
    description: 'A description of the guide.',
    titleMax: 60,
    descriptionMax: 160,
  },
  og: {
    title: 'Guide',
    description: 'A description of the guide.',
    host: 'x.dev',
    image: undefined,
  },
};

describe('PublishedFacts', () => {
  it('el ancho en píxeles va como estimación («≈») contra su límite', async () => {
    const htmlDocument = await render(PublishedFacts, { published, previews });
    expect(text(htmlDocument.querySelector('[data-width="title"]'))).toBe('≈190/580 px');
    expect(text(htmlDocument.querySelector('[data-width="description"]'))).toBe('≈120/920 px');
  });

  it('el título y la descripción llevan la etiqueta «recomendación» y el origen de la descripción', async () => {
    const htmlDocument = await render(PublishedFacts, { published, previews });
    expect(text(htmlDocument.querySelector('[data-field="title"]'))).toContain('recomendación');
    expect(text(htmlDocument.querySelector('[data-source="site"]'))).toBe('Heredada del sitio');
  });

  it('sin descripción no hay ancho ni barra para ella', async () => {
    const htmlDocument = await render(PublishedFacts, {
      published: {
        ...published,
        description: undefined,
        descriptionSource: 'none',
        descriptionLength: undefined,
        descriptionPx: undefined,
      },
      previews,
    });
    expect(htmlDocument.querySelector('[data-width="description"]')).toBeNull();
    expect(htmlDocument.querySelector('[data-field="description"] [data-meter]')).toBeNull();
  });

  it('noindex dice si está en el sitemap', async () => {
    const htmlDocument = await render(PublishedFacts, {
      published: { ...published, noindex: true },
      previews,
    });
    expect(text(htmlDocument.querySelector('[data-field="noindex"]'))).toContain(
      'fuera del sitemap',
    );
  });

  it('enseña a su lado el resultado de búsqueda y la tarjeta Open Graph', async () => {
    const htmlDocument = await render(PublishedFacts, { published, previews });
    expect(htmlDocument.querySelector('[data-serp="card"]')).not.toBeNull();
    expect(htmlDocument.querySelector('[data-og-card]')).not.toBeNull();
  });
});
