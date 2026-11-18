import { describe, expect, it } from 'vitest';
import { PAGE_SIZE, PAGE_SIZES, paginate } from './paginate';

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

describe('paginate', () => {
  it('el tamaño por defecto es 25', () => {
    expect(PAGE_SIZE).toBe(25);
  });

  it('los tamaños elegibles son 10, 25, 50 y 100, y incluyen el de por defecto', () => {
    expect(PAGE_SIZES).toEqual([10, 25, 50, 100]);
    expect(PAGE_SIZES).toContain(PAGE_SIZE);
  });

  it('lista vacía: una sola página sin filas y el rango a cero', () => {
    expect(paginate([], 1, 25)).toEqual({ rows: [], page: 1, pages: 1, total: 0, from: 0, to: 0 });
  });

  it('cabe en una página: todo, de 1 a total', () => {
    expect(paginate(rows(3), 1, 25)).toEqual({
      rows: [1, 2, 3],
      page: 1,
      pages: 1,
      total: 3,
      from: 1,
      to: 3,
    });
  });

  it('una página intermedia devuelve su trozo y su rango', () => {
    expect(paginate(rows(60), 2, 25)).toMatchObject({
      rows: rows(50).slice(25),
      page: 2,
      pages: 3,
      total: 60,
      from: 26,
      to: 50,
    });
  });

  it('la última página puede quedar a medias', () => {
    expect(paginate(rows(60), 3, 25)).toMatchObject({
      rows: rows(60).slice(50),
      page: 3,
      pages: 3,
      from: 51,
      to: 60,
    });
  });

  it('un múltiplo exacto no crea una página vacía', () => {
    expect(paginate(rows(50), 2, 25)).toMatchObject({ pages: 2, from: 26, to: 50 });
  });

  it.each([0, -3, Number.NaN, 1.5 - 2, Number.NEGATIVE_INFINITY])(
    'la página %s se lleva a la primera',
    (page) => {
      expect(paginate(rows(60), page, 25)).toMatchObject({ page: 1, from: 1, to: 25 });
    },
  );

  it.each([4, 99, Number.POSITIVE_INFINITY])(
    'la página %s, pasada del final, se lleva a la última',
    (page) => {
      expect(paginate(rows(60), page, 25)).toMatchObject({ page: 3, from: 51, to: 60 });
    },
  );

  it('una página con decimales se trunca', () => {
    expect(paginate(rows(60), 2.9, 25)).toMatchObject({ page: 2 });
  });

  it('un tamaño no válido se trata como 1 en vez de dividir por cero', () => {
    expect(paginate(rows(3), 1, 0)).toMatchObject({ pages: 3, rows: [1] });
  });
});
