import { describe, expect, it } from 'vitest';
import { pageWindow } from './page-window';

describe('pageWindow', () => {
  it('sin páginas no hay nada que enseñar', () => {
    expect(pageWindow(1, 0)).toEqual([]);
  });

  it('con una sola página, solo esa', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });

  it('con siete páginas o menos enseña todas, sin huecos', () => {
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('con ocho páginas empieza a condensar', () => {
    expect(pageWindow(4, 8)).toEqual([1, 'gap', 3, 4, 5, 'gap', 8]);
  });

  it('en la primera no hay vecina anterior: ella, la siguiente y la última', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 'gap', 20]);
  });

  it('en la última no hay vecina siguiente: la primera, la anterior y ella', () => {
    expect(pageWindow(20, 20)).toEqual([1, 'gap', 19, 20]);
  });

  it('en medio enseña primera, vecinas de la actual y última, con huecos a ambos lados', () => {
    expect(pageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  it('sin hueco cuando la vecina es contigua a la primera o a la última', () => {
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, 'gap', 20]);
    expect(pageWindow(19, 20)).toEqual([1, 'gap', 18, 19, 20]);
  });
});
