import { describe, expect, it } from 'vitest';
import { THRESHOLDS } from './thresholds';

/* Fija los valores literales: los analizadores se prueban contra `THRESHOLDS`, así que cambiarlos debe ser deliberado. */
describe('THRESHOLDS', () => {
  it('fija los límites acordados', () => {
    expect(THRESHOLDS).toEqual({
      titleMax: 60,
      titleMin: 15,
      descriptionMax: 160,
      descriptionMin: 70,
      titleMaxPx: 580,
      descriptionMaxPx: 920,
      maxH1: 1,
      ogWidth: 1200,
      ogHeight: 630,
      ogRatioTolerance: 0.02,
    });
  });
});
