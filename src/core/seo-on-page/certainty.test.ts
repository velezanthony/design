import { describe, expect, it } from 'vitest';
import { IssueKind } from './tree/types';
import { certaintyOf } from './certainty';

describe('certaintyOf', () => {
  it('el tamaño de la imagen social es heurística: 1200×630 es lo recomendado, no una regla', () => {
    expect(certaintyOf(IssueKind.OG_IMAGE_SIZE)).toBe('heuristic');
  });

  it('las comprobaciones de longitud son heurística: Google no da un límite de caracteres', () => {
    for (const kind of [
      IssueKind.TITLE_TOO_LONG,
      IssueKind.TITLE_TOO_SHORT,
      IssueKind.DESCRIPTION_TOO_LONG,
      IssueKind.DESCRIPTION_TOO_SHORT,
    ]) {
      expect(certaintyOf(kind)).toBe('heuristic');
    }
  });

  it('el resto son reglas: un hecho comprobable (duplicado, ausente, sin H1)', () => {
    const heuristics = new Set([
      'title-too-long',
      'title-too-short',
      'description-too-long',
      'description-too-short',
      'og-image-size',
    ]);
    for (const kind of Object.values(IssueKind).filter((issueKind) => !heuristics.has(issueKind))) {
      expect(certaintyOf(kind)).toBe('rule');
    }
  });
});
