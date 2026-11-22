import { describe, expect, it } from 'vitest';
import { PAGE_SIZE, PAGE_SIZES } from './page-sizes';

describe('tamaños de página del panel', () => {
  it('el tamaño por defecto es 25', () => {
    expect(PAGE_SIZE).toBe(25);
  });

  it('los tamaños elegibles son 10, 25, 50 y 100, y incluyen el de por defecto', () => {
    expect(PAGE_SIZES).toEqual([10, 25, 50, 100]);
    expect(PAGE_SIZES).toContain(PAGE_SIZE);
  });
});
