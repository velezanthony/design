import { describe, expect, it } from 'vitest';
import { resolveSidebarDepth, validateSidebarDepthFolders } from './sidebar-depth';

describe('resolveSidebarDepth', () => {
  it('sin definir no hay límite', () => {
    expect(resolveSidebarDepth(undefined)).toBeUndefined();
  });

  it('un número es el límite por defecto, sin carpetas', () => {
    expect(resolveSidebarDepth(2)).toEqual({ default: 2, overrides: {} });
  });

  it('el objeto se completa con `overrides` vacío', () => {
    expect(resolveSidebarDepth({ default: 3 })).toEqual({ default: 3, overrides: {} });
    expect(resolveSidebarDepth({ overrides: { a: 1 } })).toEqual({ overrides: { a: 1 } });
  });
});

describe('validateSidebarDepthFolders', () => {
  it('una carpeta de `overrides` que no existe es un error con su ruta', () => {
    const depth = resolveSidebarDepth({
      overrides: { 'articulos/python': 1, 'articulos/pyton': 1 },
    });
    const messages = validateSidebarDepthFolders(
      depth!,
      new Set(['articulos', 'articulos/python']),
    ).map((error) => error.message);
    expect(messages).toEqual([
      expect.stringContaining("sidebarDepth.overrides['articulos/pyton']"),
    ]);
    expect(messages[0]).toContain('«articulos/pyton»');
  });

  it('carpetas que existen: sin errores', () => {
    expect(validateSidebarDepthFolders({ overrides: { a: 1 } }, new Set(['a']))).toEqual([]);
  });
});
