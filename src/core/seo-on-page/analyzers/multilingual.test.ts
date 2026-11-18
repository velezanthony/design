import { describe, expect, it } from 'vitest';
import type { SeoLocaleEntry } from '../tree/types';
import { analyzeMultilingual } from './multilingual';

const page = { slug: 'a', locale: 'en', kind: 'native' as const, sourcePath: 'docs/a.md' };
function missing(
  policy: 'link' | 'omit' | 'fallback',
  declared: boolean,
  locale = 'es',
): SeoLocaleEntry {
  return { locale, status: 'missing', policy, declared };
}
const present: SeoLocaleEntry = { locale: 'en', status: 'present', url: '/a/' };

describe('analyzeMultilingual', () => {
  it('todos los idiomas presentes: sin problemas', () => {
    expect(analyzeMultilingual(page, [present], 'link', 'en')).toEqual([]);
  });

  it('falta sin declarar la política: warning que nombra el idioma', () => {
    const issues = analyzeMultilingual(page, [present, missing('link', false)], 'link', 'en');
    expect(issues).toMatchObject([{ kind: 'translation-missing', severity: 'warning' }]);
    expect(issues[0]?.message).toContain('es');
  });

  it('falta con política declarada: info (decisión explícita)', () => {
    const issues = analyzeMultilingual(
      page,
      [present, missing('fallback', true)],
      'fallback',
      'en',
    );
    expect(issues).toMatchObject([{ kind: 'translation-missing', severity: 'info' }]);
  });

  it('omit es siempre una decisión explícita: info aunque no se declarara en el archivo', () => {
    const issues = analyzeMultilingual(page, [present, missing('omit', false)], 'omit', 'en');
    expect(issues).toMatchObject([{ kind: 'translation-missing', severity: 'info' }]);
  });

  it('una incidencia por idioma ausente, en el orden de los idiomas', () => {
    const entries = [present, missing('link', false, 'es'), missing('link', false, 'fr')];
    expect(analyzeMultilingual(page, entries, 'link', 'en').map((issue) => issue.message)).toEqual([
      expect.stringContaining('es'),
      expect.stringContaining('fr'),
    ]);
  });

  it('políticas en conflicto dentro del grupo: error', () => {
    expect(analyzeMultilingual(page, [present], undefined, 'en')).toMatchObject([
      { kind: 'translation-policy-conflict', severity: 'error' },
    ]);
  });

  it('la ausencia dice cómo arreglarla: la ruta exacta del archivo gemelo', () => {
    const [issue] = analyzeMultilingual(page, [present, missing('link', false)], 'link', 'en');
    expect(issue!.fix).toContain('docs/a.es.md');
    expect(issue!.fix).toContain('translations: omit');
  });

  it('en una página externa apunta a docs.config.mjs, no al frontmatter', () => {
    const external = { ...page, kind: 'external' as const, sourcePath: 'CHANGELOG.md' };
    const [issue] = analyzeMultilingual(external, [present, missing('link', false)], 'link', 'en');
    expect(issue!.fix).toContain('CHANGELOG.es.md');
    expect(issue!.fix).toContain('external[].translations');
  });

  it('el conflicto de políticas nombra los archivos de los idiomas presentes del grupo', () => {
    const entries = [present, { locale: 'es', status: 'present' as const, url: '/es/a/' }];
    const [issue] = analyzeMultilingual(page, entries, undefined, 'en');
    expect(issue!.fix).toContain('docs/a.md');
    expect(issue!.fix).toContain('docs/a.es.md');
  });
});
