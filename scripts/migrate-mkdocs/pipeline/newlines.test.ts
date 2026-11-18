import { describe, expect, it } from 'vitest';
import { applyNewlineStyle, splitNewlineStyle } from './newlines.ts';

describe('splitNewlineStyle', () => {
  it('un texto con LF queda igual y se marca como lf', () => {
    expect(splitNewlineStyle('a\nb\n')).toEqual({ text: 'a\nb\n', crlf: false });
  });

  it('un texto con CRLF se normaliza a LF y se marca como crlf', () => {
    expect(splitNewlineStyle('a\r\nb\r\n')).toEqual({ text: 'a\nb\n', crlf: true });
  });

  it('con saltos mezclados gana el estilo mayoritario', () => {
    expect(splitNewlineStyle('a\r\nb\r\nc\n').crlf).toBe(true);
    expect(splitNewlineStyle('a\nb\nc\r\n').crlf).toBe(false);
  });

  it('un texto sin saltos es lf', () => {
    expect(splitNewlineStyle('a').crlf).toBe(false);
  });
});

describe('applyNewlineStyle', () => {
  it('restaura CRLF y no toca un texto lf', () => {
    expect(applyNewlineStyle('a\nb\n', true)).toBe('a\r\nb\r\n');
    expect(applyNewlineStyle('a\nb\n', false)).toBe('a\nb\n');
  });

  it('ida y vuelta conserva el original (sin ficheros mezclados)', () => {
    const original = 'a\r\n\r\nb';
    const { text, crlf } = splitNewlineStyle(original);
    expect(applyNewlineStyle(text, crlf)).toBe(original);
  });
});
