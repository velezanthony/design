import { describe, expect, it } from 'vitest';
import { collectErrors, DocsError, DocsErrors, formatPath } from './errors';

describe('DocsError', () => {
  it('guarda archivo, línea y pista, y los muestra al formatear', () => {
    const error = new DocsError('enlace roto', {
      file: 'guide.md',
      line: 12,
      hint: 'revisa la ruta',
    });
    expect(error.file).toBe('guide.md');
    expect(error.line).toBe(12);
    expect(error.hint).toBe('revisa la ruta');
    expect(error.describe()).toBe('guide.md:12: enlace roto (revisa la ruta)');
  });

  it('sin línea ni pista solo muestra lo que hay', () => {
    expect(new DocsError('algo', { file: 'a.md' }).describe()).toBe('a.md: algo');
    expect(new DocsError('algo').describe()).toBe('algo');
  });
});

describe('collectErrors', () => {
  it('sin errores no lanza', () => {
    expect(() => collectErrors([])).not.toThrow();
  });

  it('con errores lanza UNO agregado que los conserva todos', () => {
    const first = new DocsError('uno', { file: 'a.md' });
    const second = new DocsError('dos', { file: 'b.md' });
    try {
      collectErrors([first, second]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DocsErrors);
      expect((error as DocsErrors).errors).toEqual([first, second]);
      expect((error as DocsErrors).message).toContain('a.md: uno');
      expect((error as DocsErrors).message).toContain('b.md: dos');
    }
  });
});

describe('formatPath', () => {
  it('une claves con punto y pone los índices entre corchetes', () => {
    expect(formatPath(['external', 0, 'seo', 'image'])).toBe('external[0].seo.image');
    expect(formatPath(['translations', 'missing'])).toBe('translations.missing');
    expect(formatPath([])).toBe('');
  });
});

describe('formatPath: claves de JSON-LD', () => {
  it("una clave que empieza por @ va entre corchetes: seo.schema[1]['@type']", () => {
    expect(formatPath(['seo', 'schema', 1, '@type'])).toBe("seo.schema[1]['@type']");
  });
});

describe('formatPath: claves de carpeta', () => {
  it("una carpeta con barras o '*' va entre corchetes: folders['guia/avanzado']", () => {
    expect(formatPath(['folders', 'guia/avanzado', 'tree'])).toBe("folders['guia/avanzado'].tree");
    expect(formatPath(['folders', '*', 'listing'])).toBe("folders['*'].listing");
  });

  it('una carpeta de un segmento sigue con punto', () => {
    expect(formatPath(['folders', 'guia'])).toBe('folders.guia');
  });
});
