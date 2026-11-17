import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import OverviewStats from './OverviewStats.astro';

describe('OverviewStats', () => {
  it('enseña el total y separa con problemas, solo informativas y sin nada', async () => {
    const totals = { total: 10, withProblems: 4, informativeOnly: 5, clean: 1 };
    const doc = await render(OverviewStats, { totals });
    expect(text(doc.querySelector('[data-stat="total"]'))).toContain('10');
    expect(text(doc.querySelector('[data-stat="with-problems"]'))).toContain('4');
    expect(text(doc.querySelector('[data-stat="informative-only"]'))).toContain('5');
    expect(text(doc.querySelector('[data-stat="clean"]'))).toContain('1');
  });
});
