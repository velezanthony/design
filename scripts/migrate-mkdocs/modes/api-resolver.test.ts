import { describe, expect, it } from 'vitest';
import { createApiResolver } from './api-resolver.ts';

describe('createApiResolver', () => {
  it('sin JSON no resuelve nada', () => {
    const { resolveApi, strippedLinks } = createApiResolver(undefined);
    expect(resolveApi('pkg.Model')).toBeUndefined();
    expect(strippedLinks()).toBe(0);
  });

  it('devuelve el Markdown del identificador y un identificador ausente es undefined', () => {
    const { resolveApi } = createApiResolver(JSON.stringify({ 'pkg.Model': '## Model\n\ntexto' }));
    expect(resolveApi('pkg.Model')).toContain('## Model');
    expect(resolveApi('pkg.Other')).toBeUndefined();
  });
});
