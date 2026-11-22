import { describe, expect, it } from 'vitest';
import { folderLabel, humanize, listOf, plural } from './text';

describe('plural', () => {
  it('el número con la forma que le toca', () => {
    expect(plural(1, 'página', 'páginas')).toBe('1 página');
    expect(plural(0, 'página', 'páginas')).toBe('0 páginas');
    expect(plural(3, 'página', 'páginas')).toBe('3 páginas');
  });
});

describe('listOf', () => {
  it('une los elementos como en español: «a», «a y b», «a, b y c»', () => {
    expect(listOf(['en'])).toBe('en');
    expect(listOf(['en', 'es'])).toBe('en y es');
    expect(listOf(['en', 'es', 'fr'])).toBe('en, es y fr');
  });
});

describe('humanize', () => {
  it('cambia guiones y guiones bajos por espacios y pone la primera en mayúscula', () => {
    expect(humanize('getting-started')).toBe('Getting started');
    expect(humanize('primeros_pasos')).toBe('Primeros pasos');
  });
});

describe('folderLabel', () => {
  it('nombra la carpeta por su último segmento', () => {
    expect(folderLabel('guia/primeros-pasos')).toBe('Primeros pasos');
  });

  it('una carpeta de primer nivel es su propio nombre', () => {
    expect(folderLabel('tutoriales')).toBe('Tutoriales');
  });
});
