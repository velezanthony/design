import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import ViewSwitch from './ViewSwitch.astro';

const views = [
  { view: 'page', href: '/t/', current: true },
  { view: 'locale', href: '/t/?view=locale', current: false },
  { view: 'matrix', href: '/t/?view=matrix', current: false },
  { view: 'have', href: '/t/?view=have', current: false },
];

describe('ViewSwitch', () => {
  it('son enlaces (funciona sin JavaScript) con el nombre de cada vista', async () => {
    const doc = await render(ViewSwitch, { views });
    const links = [...doc.querySelectorAll('a')];
    expect(links.map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Por página', '/t/'],
      ['Por idioma', '/t/?view=locale'],
      ['Matriz de idiomas', '/t/?view=matrix'],
      ['Qué tiene', '/t/?view=have'],
    ]);
  });

  it('solo la vista actual lleva aria-current', async () => {
    const doc = await render(ViewSwitch, { views });
    const current = [...doc.querySelectorAll('a[aria-current="true"]')].map((a) => text(a));
    expect(current).toEqual(['Por página']);
  });

  it('es un grupo con nombre accesible', async () => {
    const group = (await render(ViewSwitch, { views })).querySelector('[role="group"]')!;
    expect(group.getAttribute('aria-label')).toBe('Vista');
  });
});
