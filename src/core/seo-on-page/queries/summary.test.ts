import { describe, expect, it } from 'vitest';
import { IssueKind, IssueSeverity, type Issue, type SeoPage, type SeoTree } from '../tree/types';
import { summarize } from './summary';

const issue = (kind: Issue['kind'], severity: Issue['severity']): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: '',
});
const page = (issues: Issue[]): SeoPage => ({ issues }) as SeoPage;

describe('summarize', () => {
  it('árbol vacío: todo a cero y con todas las claves', () => {
    const summary = summarize({ pages: [] });
    expect(summary).toMatchObject({ total: 0, withProblems: 0, informativeOnly: 0, clean: 0 });
    expect(Object.keys(summary.byKind).sort()).toEqual(Object.values(IssueKind).sort());
    expect(Object.keys(summary.bySeverity).sort()).toEqual(Object.values(IssueSeverity).sort());
    expect(Object.values(summary.byKind).every((n) => n === 0)).toBe(true);
  });

  it('cuenta incidencias por tipo y gravedad', () => {
    const tree: SeoTree = {
      pages: [
        page([issue('no-h1', 'error'), issue('title-too-long', 'warning')]),
        page([issue('title-too-long', 'warning')]),
        page([]),
      ],
    };
    const summary = summarize(tree);
    expect(summary.total).toBe(3);
    expect(summary.byKind['title-too-long']).toBe(2);
    expect(summary.byKind['no-h1']).toBe(1);
    expect(summary.bySeverity).toEqual({ error: 1, warning: 2, info: 0 });
  });

  it('separa problemas (error o aviso), solo informativas y limpias', () => {
    const tree: SeoTree = {
      pages: [
        page([issue('description-inherited', 'info'), issue('title-too-long', 'warning')]),
        page([issue('no-h1', 'error')]),
        page([issue('description-inherited', 'info')]),
        page([issue('description-too-short', 'info'), issue('translation-missing', 'info')]),
        page([]),
      ],
    };
    expect(summarize(tree)).toMatchObject({
      total: 5,
      withProblems: 2,
      informativeOnly: 2,
      clean: 1,
    });
  });
});
