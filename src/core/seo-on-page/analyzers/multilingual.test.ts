import { describe, expect, it } from 'vitest';
import type { SeoLocaleEntry } from '../tree/types';
import { analyzeMultilingual } from './multilingual';

const page = { slug: 'a', locale: 'en' };
const missing = (
  policy: 'link' | 'omit' | 'fallback',
  declared: boolean,
  locale = 'es',
): SeoLocaleEntry => ({ locale, status: 'missing', policy, declared });
const present: SeoLocaleEntry = { locale: 'en', status: 'present', url: '/a/' };

describe('analyzeMultilingual', () => {
  it('todos los idiomas presentes: sin problemas', () => {
    expect(analyzeMultilingual(page, [present], 'link')).toEqual([]);
  });

  it('falta sin declarar la política: warning que nombra el idioma', () => {
    const issues = analyzeMultilingual(page, [present, missing('link', false)], 'link');
    expect(issues).toMatchObject([{ kind: 'translation-missing', severity: 'warning' }]);
    expect(issues[0].message).toContain('es');
  });

  it('falta con política declarada: info (decisión explícita)', () => {
    const issues = analyzeMultilingual(page, [present, missing('fallback', true)], 'fallback');
    expect(issues).toMatchObject([{ kind: 'translation-missing', severity: 'info' }]);
  });

  it('omit es siempre una decisión explícita: info aunque no se declarara en el archivo', () => {
    const issues = analyzeMultilingual(page, [present, missing('omit', false)], 'omit');
    expect(issues).toMatchObject([{ kind: 'translation-missing', severity: 'info' }]);
  });

  it('una incidencia por idioma ausente, en el orden de los idiomas', () => {
    const entries = [present, missing('link', false, 'es'), missing('link', false, 'fr')];
    expect(analyzeMultilingual(page, entries, 'link').map((issue) => issue.message)).toEqual([
      expect.stringContaining('es'),
      expect.stringContaining('fr'),
    ]);
  });

  it('políticas en conflicto dentro del grupo: error', () => {
    expect(analyzeMultilingual(page, [present], undefined)).toMatchObject([
      { kind: 'translation-policy-conflict', severity: 'error' },
    ]);
  });
});
