import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import TableHead from './TableHead.astro';

const views = [{ view: 'page', href: '/t/', current: true }];

describe('TableHead', () => {
  it('dice el recuento y enseña el selector de vista', async () => {
    const htmlDocument = await render(TableHead, { count: '38 páginas', views });
    expect(text(htmlDocument.querySelector('[data-head-count]'))).toBe('38 páginas');
    expect(htmlDocument.querySelector('[role="group"]')).not.toBeNull();
  });

  it('con `copyReport` el recuento ofrece copiar esas páginas para la IA, sobre el filtro actual', async () => {
    const htmlDocument = await render(TableHead, {
      count: '3 páginas sin schema propio',
      views,
      copyReport: true,
    });
    const button = htmlDocument.querySelector('[data-head-count] button')!;
    expect(button.getAttribute('data-report-open')).toBe('filter');
    expect(text(htmlDocument.querySelector('[data-head-count]'))).toBe(
      '3 páginas sin schema propio · copiarlas para la IA',
    );
  });

  it('sin `copyReport` no hay botón', async () => {
    const htmlDocument = await render(TableHead, { count: '3 páginas', views });
    expect(htmlDocument.querySelector('[data-head-count] button')).toBeNull();
  });
});
