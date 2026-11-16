import { describe, expect, it } from 'vitest';
import type { SidebarItem } from '../config/schema';
import { toSidebarSlug, validateSidebarSlugs } from './sidebar-slugs';

const slugs = new Set(['', 'guide', 'guide/api']);

describe('toSidebarSlug', () => {
  it("'index' es la portada (slug vacío)", () => {
    expect(toSidebarSlug('index')).toBe('');
    expect(toSidebarSlug('guide')).toBe('guide');
  });
});

describe('validateSidebarSlugs', () => {
  it('no falla si todos existen, portada incluida', () => {
    const items: SidebarItem[] = ['index', { label: 'G', slug: 'guide', items: ['guide/api'] }];
    expect(validateSidebarSlugs(items, slugs)).toEqual([]);
  });

  it('agrega todos los desconocidos con su ruta en la config', () => {
    const items: SidebarItem[] = [
      'guide',
      'nope',
      { label: 'G', slug: 'ghost', items: ['guide/api', 'also-nope'] },
    ];
    const messages = validateSidebarSlugs(items, slugs).map((e) => e.message);
    expect(messages).toHaveLength(3);
    expect(messages[0]).toContain('sidebar[1]');
    expect(messages[0]).toContain('nope');
    expect(messages[1]).toContain('sidebar[2].slug');
    expect(messages[1]).toContain('ghost');
    expect(messages[2]).toContain('sidebar[2].items[1]');
    expect(messages[2]).toContain('also-nope');
  });

  it("el slug vacío no es válido: la portada se escribe 'index'", () => {
    expect(validateSidebarSlugs([''], slugs)).toHaveLength(1);
  });
});
