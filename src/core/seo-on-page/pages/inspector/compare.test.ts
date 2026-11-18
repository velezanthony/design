import { describe, expect, it } from 'vitest';
import { THRESHOLDS } from '../../thresholds';
import { differing, lengthClass } from './compare';

describe('lengthClass', () => {
  const { descriptionMin: min, descriptionMax: max } = THRESHOLDS;

  it('por debajo del mínimo es corta', () => {
    expect(lengthClass(min - 1, min, max)).toBe('low');
  });

  it('justo en el mínimo está al límite: cumple, pero sin margen frente a otro idioma', () => {
    expect(lengthClass(min, min, max)).toBe('edge');
  });

  it('entre el mínimo y el máximo está bien, máximo incluido', () => {
    expect(lengthClass(min + 1, min, max)).toBe('ok');
    expect(lengthClass(max, min, max)).toBe('ok');
  });

  it('por encima del máximo es larga', () => {
    expect(lengthClass(max + 1, min, max)).toBe('long');
  });

  it('sin texto no hay longitud que comparar', () => {
    expect(lengthClass(undefined, min, max)).toBe('none');
  });
});

describe('differing', () => {
  it('si todos los idiomas coinciden no se marca ninguno', () => {
    expect(differing(['ok', 'ok'], 'ok')).toEqual([false, false]);
    expect(differing(['low', 'low'], 'ok')).toEqual([false, false]);
  });

  it('se marca el que se aparta del valor bueno', () => {
    expect(differing(['ok', 'low'], 'ok')).toEqual([false, true]);
    expect(differing(['low', 'ok', 'ok'], 'ok')).toEqual([true, false, false]);
  });

  it('sin ninguno bueno, la referencia es el primer idioma', () => {
    expect(differing(['low', 'long'], 'ok')).toEqual([false, true]);
  });
});
