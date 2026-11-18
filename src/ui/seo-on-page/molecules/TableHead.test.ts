import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import TableHead from './TableHead.astro';

const views = [{ view: 'page', href: '/t/', current: true }];

describe('TableHead', () => {
  it('dice el recuento y enseña el selector de vista', async () => {
    const doc = await render(TableHead, { count: '38 páginas', views });
    expect(text(doc.querySelector('[data-head-count]'))).toBe('38 páginas');
    expect(doc.querySelector('[role="group"]')).not.toBeNull();
  });

  it('con `copyReport` el recuento ofrece copiar esas páginas para la IA, sobre el filtro actual', async () => {
    const doc = await render(TableHead, {
      count: '3 páginas sin schema propio',
      views,
      copyReport: true,
    });
    const button = doc.querySelector('[data-head-count] button')!;
    expect(button.getAttribute('data-report-open')).toBe('filter');
    expect(text(doc.querySelector('[data-head-count]'))).toBe(
      '3 páginas sin schema propio · copiarlas para la IA',
    );
  });

  it('sin `copyReport` no hay botón', async () => {
    const doc = await render(TableHead, { count: '3 páginas', views });
    expect(doc.querySelector('[data-head-count] button')).toBeNull();
  });
});
