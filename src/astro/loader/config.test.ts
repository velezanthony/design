import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { docs } from '../integration';
import { readIntegrationConfig } from './config';

describe('readIntegrationConfig', () => {
  it('devuelve la config de la integración por su nombre', () => {
    const integration = docs({ name: 'x' });
    expect(readIntegrationConfig([{ name: 'otra' }, integration])).toBe(integration.resolvedConfig);
  });

  it('sin la integración falla con una pista accionable', () => {
    const error = (() => {
      try {
        readIntegrationConfig([{ name: 'otra' }]);
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(AstroError);
    expect((error as AstroError).hint).toContain('docs.config.mjs');
  });

  it('una integración con el nombre pero sin config también falla', () => {
    expect(() => readIntegrationConfig([{ name: '@velezanthony/design' }])).toThrow(AstroError);
  });
});
