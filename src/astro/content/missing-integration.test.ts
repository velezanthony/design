import { describe, expect, it } from 'vitest';
import { isMissingVirtualConfig } from './missing-integration';

describe('isMissingVirtualConfig', () => {
  it('reconoce el error de Vite cuando el módulo virtual no existe', () => {
    const error = new Error(
      "Cannot find module 'virtual:@velezanthony/design/config' imported from '/repo/node_modules/x.ts'",
    );
    expect(isMissingVirtualConfig(error)).toBe(true);
  });

  it('no confunde con eso un fallo de otro módulo', () => {
    expect(isMissingVirtualConfig(new Error("Cannot find module 'otra-cosa'"))).toBe(false);
  });

  it('no confunde con eso un fallo dentro del propio módulo virtual', () => {
    expect(isMissingVirtualConfig(new SyntaxError('Unexpected token'))).toBe(false);
  });

  it('tolera lo que no es un Error', () => {
    expect(isMissingVirtualConfig('Cannot find module')).toBe(false);
    expect(isMissingVirtualConfig(undefined)).toBe(false);
  });
});
