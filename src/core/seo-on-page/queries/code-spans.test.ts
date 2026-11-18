import { describe, expect, it } from 'vitest';
import { codeSpans, plainText } from './code-spans';

describe('codeSpans', () => {
  it('separa el texto normal de lo que va entre comillas de código', () => {
    expect(codeSpans('Añade `seo.title` en `docs/x.md`.')).toEqual([
      { text: 'Añade ', code: false },
      { text: 'seo.title', code: true },
      { text: ' en ', code: false },
      { text: 'docs/x.md', code: true },
      { text: '.', code: false },
    ]);
  });

  it('sin comillas es un solo trozo de texto', () => {
    expect(codeSpans('Sin código.')).toEqual([{ text: 'Sin código.', code: false }]);
  });

  it('una comilla sin cerrar se queda como texto, no abre un trozo de código', () => {
    expect(codeSpans('Usa `seo.title en el fichero')).toEqual([
      { text: 'Usa `seo.title en el fichero', code: false },
    ]);
  });

  it('no deja trozos vacíos', () => {
    expect(codeSpans('`a``b`')).toEqual([
      { text: 'a', code: true },
      { text: 'b', code: true },
    ]);
  });
});

describe('plainText', () => {
  it('quita las comillas de código para donde no cabe HTML (un title)', () => {
    expect(plainText('Añade `seo.title` en `docs/x.md`.')).toBe('Añade seo.title en docs/x.md.');
  });
});
