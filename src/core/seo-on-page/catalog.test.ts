import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import { THRESHOLDS } from './thresholds';
import { IssueKind, IssueSeverity } from './tree/types';

describe('CATALOG', () => {
  it('tiene una entrada por cada tipo de problema', () => {
    expect(Object.keys(CATALOG).sort()).toEqual(Object.values(IssueKind).sort());
  });

  it('cada tipo dice por qué, cómo arreglarlo y cómo verificarlo', () => {
    for (const kind of Object.values(IssueKind)) {
      expect(CATALOG[kind].why.length, kind).toBeGreaterThan(10);
      expect(CATALOG[kind].fix.length, kind).toBeGreaterThan(10);
      expect(CATALOG[kind].verify([]).length, kind).toBeGreaterThan(10);
    }
  });

  describe('severity', () => {
    it('la de por defecto de un H1 ausente es error y la de una descripción heredada, info', () => {
      expect(CATALOG[IssueKind.NO_H1].severity).toBe(IssueSeverity.ERROR);
      expect(CATALOG[IssueKind.DESCRIPTION_INHERITED].severity).toBe(IssueSeverity.INFO);
    });
  });

  describe('certainty', () => {
    it('el tamaño de la imagen social es heurística: 1200×630 es lo recomendado, no una regla', () => {
      expect(CATALOG[IssueKind.OG_IMAGE_SIZE].certainty).toBe('heuristic');
    });

    it('las comprobaciones de longitud son heurística: Google no da un límite de caracteres', () => {
      for (const kind of [
        IssueKind.TITLE_TOO_LONG,
        IssueKind.TITLE_TOO_SHORT,
        IssueKind.DESCRIPTION_TOO_LONG,
        IssueKind.DESCRIPTION_TOO_SHORT,
      ]) {
        expect(CATALOG[kind].certainty).toBe('heuristic');
      }
    });

    it('el resto son reglas: un hecho comprobable (duplicado, ausente, sin H1)', () => {
      const heuristics = new Set<string>([
        IssueKind.TITLE_TOO_LONG,
        IssueKind.TITLE_TOO_SHORT,
        IssueKind.DESCRIPTION_TOO_LONG,
        IssueKind.DESCRIPTION_TOO_SHORT,
        IssueKind.OG_IMAGE_SIZE,
      ]);
      for (const kind of Object.values(IssueKind).filter((own) => !heuristics.has(own))) {
        expect(CATALOG[kind].certainty).toBe('rule');
      }
    });
  });

  describe('verify', () => {
    it('un título largo se verifica contra el máximo de caracteres', () => {
      expect(CATALOG[IssueKind.TITLE_TOO_LONG].verify([])).toContain(String(THRESHOLDS.titleMax));
    });

    it('un título corto se verifica contra el mínimo', () => {
      expect(CATALOG[IssueKind.TITLE_TOO_SHORT].verify([])).toContain(String(THRESHOLDS.titleMin));
    });

    it('una descripción heredada se arregla cuando su fuente pasa a ser la de la página', () => {
      expect(CATALOG[IssueKind.DESCRIPTION_INHERITED].verify([])).toContain('De la página');
    });

    it('un duplicado desaparece aquí y en las páginas con las que chocaba', () => {
      const text = CATALOG[IssueKind.DUPLICATE_TITLE].verify(['users/reference', 'users/guide']);
      expect(text).toContain('users/reference');
      expect(text).toContain('users/guide');
    });

    it('la portada, como página relacionada, se nombra «/»', () => {
      expect(CATALOG[IssueKind.DUPLICATE_DESCRIPTION].verify([''])).toContain('«/»');
    });
  });

  describe('limit', () => {
    it('el título lleva su rango de caracteres y su ancho en píxeles', () => {
      expect(CATALOG[IssueKind.TITLE_TOO_SHORT].limit).toEqual({
        min: THRESHOLDS.titleMin,
        max: THRESHOLDS.titleMax,
        maxPx: THRESHOLDS.titleMaxPx,
      });
    });

    it('la descripción, también, tanto si falta como si es heredada, corta o larga', () => {
      const expected = {
        min: THRESHOLDS.descriptionMin,
        max: THRESHOLDS.descriptionMax,
        maxPx: THRESHOLDS.descriptionMaxPx,
      };
      for (const kind of [
        IssueKind.DESCRIPTION_MISSING,
        IssueKind.DESCRIPTION_INHERITED,
        IssueKind.DESCRIPTION_TOO_SHORT,
        IssueKind.DESCRIPTION_TOO_LONG,
      ]) {
        expect(CATALOG[kind].limit, kind).toEqual(expected);
      }
    });

    it('un problema que no es de longitud no tiene límite', () => {
      expect(CATALOG[IssueKind.DUPLICATE_TITLE].limit).toBeUndefined();
      expect(CATALOG[IssueKind.NO_H1].limit).toBeUndefined();
    });
  });
});
