import { describe, expect, it } from 'vitest';
import { headingKey, validateAnchors, type HeadingIndex } from './anchors';
import type { LinkRef } from './rewrite';

const headings: HeadingIndex = new Map([
  [headingKey('install', 'en'), new Set(['requirements', 'usage'])],
  [headingKey('install', 'es'), new Set(['requisitos', 'instalación'])],
  [headingKey('bare', 'en'), new Set()],
]);

const ref = (over: Partial<LinkRef> = {}): LinkRef => ({
  file: 'guide.md',
  line: 4,
  slug: 'install',
  locale: 'en',
  anchor: 'usage',
  ...over,
});

describe('validateAnchors', () => {
  it('un ancla que existe en el destino no da error', () => {
    expect(validateAnchors([ref()], headings)).toEqual([]);
  });

  it('un ancla rota es un error con archivo, línea y destino', () => {
    const [error] = validateAnchors([ref({ anchor: 'nope' })], headings);
    expect(error.file).toBe('guide.md');
    expect(error.line).toBe(4);
    expect(error.message).toContain('#nope');
  });

  it('valida contra la gemela del idioma del enlace', () => {
    expect(validateAnchors([ref({ locale: 'es', anchor: 'requisitos' })], headings)).toEqual([]);
    expect(validateAnchors([ref({ locale: 'es', anchor: 'usage' })], headings)).toHaveLength(1);
  });

  it('acepta anclas con porcentaje que decodifican a un id con acento', () => {
    const accented = ref({ locale: 'es', anchor: 'instalaci%C3%B3n' });
    expect(validateAnchors([accented], headings)).toEqual([]);
  });

  it('las referencias sin ancla no se validan', () => {
    const plain = ref();
    delete plain.anchor;
    expect(validateAnchors([plain], headings)).toEqual([]);
  });

  it('un destino sin encabezados o desconocido rompe cualquier ancla', () => {
    expect(validateAnchors([ref({ slug: 'bare' })], headings)).toHaveLength(1);
    expect(validateAnchors([ref({ slug: 'ghost' })], headings)).toHaveLength(1);
  });

  it('agrega todos los fallos', () => {
    const refs = [ref({ anchor: 'a' }), ref({ anchor: 'usage' }), ref({ anchor: 'b', line: 9 })];
    expect(validateAnchors(refs, headings).map((e) => e.line)).toEqual([4, 9]);
  });
});
