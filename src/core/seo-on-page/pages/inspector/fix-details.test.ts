import { describe, expect, it } from 'vitest';
import { THRESHOLDS } from '../../thresholds';
import { IssueKind } from '../../tree/types';
import { limitOf, verifyFor } from './fix-details';

describe('verifyFor', () => {
  it('dice algo para cada tipo de problema', () => {
    for (const kind of Object.values(IssueKind)) {
      expect(verifyFor(kind, []).length, kind).toBeGreaterThan(10);
    }
  });

  it('un título largo se verifica contra el máximo de caracteres', () => {
    expect(verifyFor(IssueKind.TITLE_TOO_LONG, [])).toContain(String(THRESHOLDS.titleMax));
  });

  it('un título corto se verifica contra el mínimo', () => {
    expect(verifyFor(IssueKind.TITLE_TOO_SHORT, [])).toContain(String(THRESHOLDS.titleMin));
  });

  it('una descripción heredada se arregla cuando su fuente pasa a ser la de la página', () => {
    expect(verifyFor(IssueKind.DESCRIPTION_INHERITED, [])).toContain('De la página');
  });

  it('un duplicado desaparece aquí y en las páginas con las que chocaba', () => {
    const text = verifyFor(IssueKind.DUPLICATE_TITLE, ['users/reference', 'users/guide']);
    expect(text).toContain('users/reference');
    expect(text).toContain('users/guide');
  });

  it('la portada, como página relacionada, se nombra «/»', () => {
    expect(verifyFor(IssueKind.DUPLICATE_DESCRIPTION, [''])).toContain('«/»');
  });
});

describe('limitOf', () => {
  it('el título lleva su rango de caracteres y su ancho en píxeles', () => {
    expect(limitOf(IssueKind.TITLE_TOO_SHORT)).toEqual({
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
      expect(limitOf(kind), kind).toEqual(expected);
    }
  });

  it('un problema que no es de longitud no tiene límite', () => {
    expect(limitOf(IssueKind.DUPLICATE_TITLE)).toBeUndefined();
    expect(limitOf(IssueKind.NO_H1)).toBeUndefined();
  });
});
