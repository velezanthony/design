import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import PublishedFacts from './PublishedFacts.astro';

const published = {
  title: 'Guide | Site',
  titleLength: 12,
  titleMax: 60,
  description: 'A description of the guide.',
  descriptionSource: 'page' as const,
  descriptionLength: 27,
  descriptionMax: 160,
  canonical: '/repo/guide/',
  noindex: false,
  sourcePath: 'guide.md',
};

describe('PublishedFacts', () => {
  it('enseña el <title> publicado y de dónde sale la descripción', async () => {
    const content = text(await render(PublishedFacts, { published }));
    expect(content).toContain('Guide | Site');
    expect(content).toContain('12 / 60');
    expect(content).toContain('A description of the guide.');
    expect(content).toContain('De la página');
    expect(content).toContain('27 / 160');
  });

  it('enseña el canonical, si la página es noindex y su archivo', async () => {
    const doc = await render(PublishedFacts, { published: { ...published, noindex: true } });
    expect(text(doc.querySelector('[data-field="canonical"]'))).toContain('/repo/guide/');
    expect(text(doc.querySelector('[data-field="noindex"]'))).toContain('Sí');
    expect(text(doc)).toContain('guide.md');
  });

  it('sin descripción enseña un guion y no su longitud', async () => {
    const doc = await render(PublishedFacts, {
      published: {
        ...published,
        description: undefined,
        descriptionSource: 'none',
        descriptionLength: undefined,
      },
    });
    expect(text(doc)).toContain('—');
    expect(text(doc)).not.toContain('/ 160');
  });

  it('el encabezado lleva el id que usa «En esta página»', async () => {
    const doc = await render(PublishedFacts, { published });
    expect(doc.querySelector('h2#published')).not.toBeNull();
  });
});
