import { describe, expect, it } from 'vitest';
import { headingCounts } from '../../../core/seo-on-page/queries/heading-counts';
import { outline as outlineOf } from '../../../core/seo-on-page/queries/outline';
import { render, text } from '../../../testing/render';
import HeadingsOutline from './HeadingsOutline.astro';

const h = (depth: number, label = `T${depth}`) => ({ depth, slug: label, text: label });
const props = (headings: ReturnType<typeof h>[]) => ({
  headings: { counts: headingCounts(headings), outline: outlineOf(headings) },
});

describe('HeadingsOutline', () => {
  it('una estructura buena dice «Un H1 · sin saltos de nivel»', async () => {
    const doc = await render(HeadingsOutline, props([h(1), h(2), h(3)]));
    expect(text(doc.querySelector('[data-headings-status="ok"]'))).toBe(
      '✓ Un H1 · sin saltos de nivel',
    );
  });

  it('una mala lista cada problema en lugar del visto bueno', async () => {
    const doc = await render(HeadingsOutline, props([h(2), h(4)]));
    expect(doc.querySelector('[data-headings-status="ok"]')).toBeNull();
    const status = text(doc.querySelector('[data-headings-status="problems"]'));
    expect(status).toContain('Sin H1');
    expect(status).toContain('Salto de H2 a H4');
  });

  it('el contador enseña los seis niveles y el total, y apaga los que valen cero', async () => {
    const doc = await render(HeadingsOutline, props([h(1), h(2), h(2)]));
    const items = [...doc.querySelectorAll('[data-counts] li')];
    expect(items.map((item) => text(item))).toEqual([
      'H1 1',
      'H2 2',
      'H3 0',
      'H4 0',
      'H5 0',
      'H6 0',
      'Total 3',
    ]);
    expect(items.filter((item) => item.hasAttribute('data-zero'))).toHaveLength(4);
  });

  it('el esquema sangra por nivel y marca el salto', async () => {
    const doc = await render(HeadingsOutline, props([h(1, 'Uno'), h(2, 'Dos'), h(4, 'Cuatro')]));
    const items = [...doc.querySelectorAll('[data-outline] li')];
    expect(items.map((item) => item.hasAttribute('data-skip'))).toEqual([false, false, true]);
    expect(text(items[2]!)).toContain('Salto H2 → H4');
  });

  it('sin encabezados lo dice', async () => {
    const doc = await render(HeadingsOutline, props([]));
    expect(text(doc.querySelector('[data-outline-empty]'))).toContain('Sin encabezados');
  });
});
