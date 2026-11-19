import tailwindcss from '@tailwindcss/vite';
import { describe, expect, it } from 'vitest';
import { tailwindPlugins } from './tailwind';

function namesOf(plugins: unknown[]): string[] {
  return plugins.flat().map((plugin) => (plugin as { name: string }).name);
}

describe('tailwindPlugins', () => {
  it('sin plugins previos devuelve los de Tailwind', () => {
    expect(
      namesOf(tailwindPlugins(undefined)).some((name) => name.startsWith('@tailwindcss/vite')),
    ).toBe(true);
  });

  it('si el sitio ya registró Tailwind (a mano o anidado) no lo repite', () => {
    expect(tailwindPlugins([tailwindcss()])).toEqual([]);
    expect(tailwindPlugins([[{ name: 'otro' }], [tailwindcss()]])).toEqual([]);
  });

  it('otros plugins no cuentan', () => {
    expect(tailwindPlugins([{ name: 'otro' }, false, null]).length).toBeGreaterThan(0);
  });
});
