import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import ResultsCount from './ResultsCount.astro';

describe('ResultsCount', () => {
  it('«1–25 de 75 páginas»', async () => {
    const htmlDocument = await render(ResultsCount, { from: 1, to: 25, total: 75, overall: 75 });
    expect(text(htmlDocument)).toContain('1–25 de 75 páginas');
  });

  it('con filtros dice también cuántas hay en total', async () => {
    const htmlDocument = await render(ResultsCount, { from: 1, to: 6, total: 6, overall: 75 });
    expect(text(htmlDocument)).toContain('1–6 de 6 páginas');
    expect(text(htmlDocument)).toContain('75 en total');
  });

  it('sin resultados: «0 de N»', async () => {
    const htmlDocument = await render(ResultsCount, { from: 0, to: 0, total: 0, overall: 75 });
    expect(text(htmlDocument)).toContain('0 de 75 páginas');
  });
});
