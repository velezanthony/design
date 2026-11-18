import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import OverviewKpis from './OverviewKpis.astro';

const kpis = {
  health: { healthy: 35, total: 38, percent: 92 },
  pages: { pages: 38, entries: 75 },
  locales: [
    { locale: 'en', entries: 38 },
    { locale: 'es', entries: 37 },
  ],
  problems: { pages: 3, errors: 0, warnings: 3, entries: 6, href: '/t/' },
  info: { pages: 38, entries: 75, kinds: ['description-inherited'], href: '/t/?severity=info' },
};

describe('OverviewKpis', () => {
  it('la salud enseña el porcentaje con la cuenta que lo explica', async () => {
    const htmlDocument = await render(OverviewKpis, { kpis });
    const health = text(htmlDocument.querySelector('[data-kpi="health"]'));
    expect(health).toContain('92');
    expect(health).toContain('35 sin errores ni avisos ÷ 38 páginas');
  });

  it('con problemas e informativas enlazan a la tabla; sin ellas no hay enlace', async () => {
    const htmlDocument = await render(OverviewKpis, { kpis });
    expect(htmlDocument.querySelector('[data-kpi="problems"] a')!.getAttribute('href')).toBe('/t/');
    expect(htmlDocument.querySelector('[data-kpi="info"] a')!.getAttribute('href')).toBe(
      '/t/?severity=info',
    );
    const none = await render(OverviewKpis, {
      kpis: {
        ...kpis,
        problems: { pages: 0, errors: 0, warnings: 0, entries: 0, href: undefined },
        info: { pages: 0, entries: 0, kinds: [], href: undefined },
      },
    });
    expect(none.querySelector('[data-kpi="problems"] a')).toBeNull();
    expect(none.querySelector('[data-kpi="info"] a')).toBeNull();
    expect(text(none.querySelector('[data-kpi="info"]'))).toContain('ninguna');
  });

  it('los idiomas dicen cuántas entradas tiene cada uno', async () => {
    const htmlDocument = await render(OverviewKpis, { kpis });
    expect(text(htmlDocument.querySelector('[data-kpi="locales"]'))).toContain('en (38) · es (37)');
  });
});
