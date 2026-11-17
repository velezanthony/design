import { describe, expect, it } from 'vitest';
import { render } from '../../../testing/render';
import Previews from './Previews.astro';

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

describe('Previews', () => {
  it('lleva la vista previa del buscador y la tarjeta Open Graph', async () => {
    const doc = await render(Previews, { previews });
    expect(doc.querySelector('[data-serp="title"]')).not.toBeNull();
    expect(doc.querySelector('[data-og-card]')).not.toBeNull();
  });

  it('pinta la imagen OG que trae el modelo, con su src ya resuelto', async () => {
    const image = { src: '/repo/og.png', alt: 'logo', width: 10, height: 5 };
    const doc = await render(Previews, {
      previews: { ...previews, og: { ...previews.og, image } },
    });
    expect(doc.querySelector('[data-og-card] img')?.getAttribute('src')).toBe('/repo/og.png');
  });

  it('el encabezado lleva el id que usa «En esta página»', async () => {
    const doc = await render(Previews, { previews });
    expect(doc.querySelector('h2#previews')).not.toBeNull();
  });
});
