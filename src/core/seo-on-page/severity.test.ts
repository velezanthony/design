import { describe, expect, it } from 'vitest';
import {
  ACTIONABLE_SEVERITIES,
  ALL_SEVERITIES,
  compareSeverity,
  isActionable,
  worst,
} from './severity';
import type { IssueSeverity } from './tree/types';

describe('gravedades', () => {
  it('van de más a menos grave: error, aviso, información', () => {
    expect(ALL_SEVERITIES).toEqual(['error', 'warning', 'info']);
    const shuffled: IssueSeverity[] = ['info', 'error', 'warning'];
    expect(shuffled.sort(compareSeverity)).toEqual(['error', 'warning', 'info']);
  });

  it('lo que hay que arreglar son los errores y los avisos; la información no', () => {
    expect(ACTIONABLE_SEVERITIES).toEqual(['error', 'warning']);
    expect(ALL_SEVERITIES.filter(isActionable)).toEqual(ACTIONABLE_SEVERITIES);
  });

  it('la peor de una lista, o ninguna si está vacía', () => {
    expect(worst(['info', 'warning', 'info'])).toBe('warning');
    expect(worst(['warning', 'error'])).toBe('error');
    expect(worst([])).toBeUndefined();
  });
});
