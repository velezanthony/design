import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import SerpPreview from './SerpPreview.astro';

function props(extra: Record<string, unknown> = {}) {
  return {
    title: 'Guide | Site',
    url: 'https://x.dev/repo/guide/',
    description: 'A description.',
    titleMax: 60,
    descriptionMax: 160,
    ...extra,
  };
}

describe('SerpPreview', () => {
  it('enseña título, URL y descripción tal como salen', async () => {
    const doc = await render(SerpPreview, props());
    const content = text(doc);
    expect(content).toContain('Guide | Site');
    expect(content).toContain('https://x.dev/repo/guide/');
    expect(content).toContain('A description.');
  });

  it('recorta con «…» lo que pasa del límite, como hace el buscador', async () => {
    const doc = await render(SerpPreview, props({ title: 'x'.repeat(70), titleMax: 60 }));
    const shown = text(doc.querySelector('[data-serp="title"]'));
    expect(shown).toBe(`${'x'.repeat(59)}…`);
  });

  it('sin descripción avisa de que el buscador elegirá el fragmento', async () => {
    const doc = await render(SerpPreview, props({ description: undefined }));
    expect(text(doc.querySelector('[data-serp="description"]'))).toContain('Sin descripción');
  });
});
