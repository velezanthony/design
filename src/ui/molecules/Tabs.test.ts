import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import Tabs from './Tabs.astro';

const panels = [
  { label: 'npm', html: '<p>npm i</p>' },
  { label: 'pnpm', html: '<p>pnpm add</p>' },
];

describe('Tabs', () => {
  /* Contrato con `initTabs`: div.docs-tabs > div.docs-tab-panel > div.docs-tab-label + contenido. */
  it('emite el marcado que mejora initTabs', async () => {
    const htmlDocument = await render(Tabs, { panels });
    const group = htmlDocument.querySelector('div.docs-tabs')!;
    const items = [...group.querySelectorAll(':scope > div.docs-tab-panel')];
    expect(items).toHaveLength(2);
    expect(items.map((item) => text(item.querySelector(':scope > .docs-tab-label')))).toEqual([
      'npm',
      'pnpm',
    ]);
    expect(text(items[1]!)).toContain('pnpm add');
  });

  /* Sin JS todos los paneles siguen legibles: ninguno nace oculto ni con rol aún. */
  it('sin JavaScript no oculta ningún panel ni lo marca como mejorado', async () => {
    const htmlDocument = await render(Tabs, { panels });
    expect(htmlDocument.querySelector('[hidden]')).toBeNull();
    expect(htmlDocument.querySelector('[data-enhanced]')).toBeNull();
    expect(htmlDocument.querySelector('[role]')).toBeNull();
  });

  it('inserta el html del panel sin escapar (bloques anidados)', async () => {
    const htmlDocument = await render(Tabs, {
      panels: [{ label: 'a', html: '<pre><code>x</code></pre>' }],
    });
    expect(htmlDocument.querySelector('.docs-tab-panel pre code')).not.toBeNull();
  });

  it('un grupo vacío no pinta nada', async () => {
    expect((await render(Tabs, { panels: [] })).querySelector('.docs-tabs')).toBeNull();
  });
});
