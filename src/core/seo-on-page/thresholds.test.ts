import { describe, expect, it } from 'vitest';
import { isTitleOutOfRange, THRESHOLDS } from './thresholds';

/* Los límites son una decisión, no un detalle: los analizadores se prueban contra `THRESHOLDS`, así
   que si alguien cambia un número sus tests siguen en verde. Este test fija los valores literales
   para que cambiarlos sea un acto deliberado (y se revise el porqué que documenta cada uno). */
describe('THRESHOLDS', () => {
  it('fija los límites acordados', () => {
    expect(THRESHOLDS).toEqual({
      titleMax: 60,
      titleMin: 15,
      descriptionMax: 160,
      descriptionMin: 70,
      maxH1: 1,
    });
  });
});

describe('isTitleOutOfRange', () => {
  it('dentro de [titleMin, titleMax] está en rango, límites incluidos', () => {
    expect(isTitleOutOfRange(THRESHOLDS.titleMin)).toBe(false);
    expect(isTitleOutOfRange(THRESHOLDS.titleMax)).toBe(false);
  });

  it('un carácter por encima del máximo o por debajo del mínimo queda fuera', () => {
    expect(isTitleOutOfRange(THRESHOLDS.titleMax + 1)).toBe(true);
    expect(isTitleOutOfRange(THRESHOLDS.titleMin - 1)).toBe(true);
  });
});
