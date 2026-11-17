import { describe, expect, it } from 'vitest';
import { convertTabs } from './tabs';
import type { Recurse } from '../../pipeline/types';

const identity: Recurse = (lines) => ({ output: lines, log: [] });
const run = (lines: string[], recurse = identity) => convertTabs(lines, 0, 0, recurse);

describe('convertTabs', () => {
  it('no actúa sobre una línea que no es una pestaña', () => {
    expect(run(['texto'])).toBeUndefined();
    expect(run(['=== sin comillas'])).toBeUndefined();
  });

  it('agrupa las pestañas consecutivas en un solo `::::tabs`', () => {
    const out = run([
      '=== "npm"',
      '',
      '    npm i',
      '',
      '=== "pnpm"',
      '',
      '    pnpm add',
      '',
      'After',
    ]);
    expect(out?.output).toEqual([
      '::::tabs',
      ':::tab[npm]',
      'npm i',
      ':::',
      ':::tab[pnpm]',
      'pnpm add',
      ':::',
      '::::',
    ]);
    expect(out?.next).toBe(7);
    expect(out?.log).toEqual([{ kind: 'tabs', line: 1, detail: '2 tabs' }]);
  });

  it('un texto entre pestañas separa los grupos', () => {
    const out = run(['=== "A"', '    a', '', 'texto', '', '=== "B"', '    b']);
    expect(out?.output).toEqual(['::::tabs', ':::tab[A]', 'a', ':::', '::::']);
    expect(out?.next).toBe(2);
  });

  it('una pestaña con otra indentación no se une al grupo', () => {
    const out = run(['=== "A"', '    a', '  === "B"', '      b']);
    expect(out?.log[0].detail).toBe('1 tabs');
  });

  it('cada cuerpo pasa por la recursión con su desplazamiento', () => {
    const offsets: number[] = [];
    const recurse: Recurse = (lines, offset) => {
      offsets.push(offset);
      return { output: lines, log: [] };
    };
    run(['=== "A"', '    a', '=== "B"', '    b'], recurse);
    expect(offsets).toEqual([1, 3]);
  });

  it('el registro de los cuerpos va antes que el de las pestañas', () => {
    const recurse: Recurse = (lines) => ({
      output: lines,
      log: [{ kind: 'icon', line: 1, detail: 'i' }],
    });
    expect(run(['=== "A"', '    a'], recurse)?.log.map((entry) => entry.kind)).toEqual([
      'icon',
      'tabs',
    ]);
  });

  it('con directivas dentro, el contenedor sube los dos puntos', () => {
    const recurse: Recurse = () => ({ output: [':::note[N]', 'x', ':::'], log: [] });
    const out = run(['=== "A"', '    !!! note "N"', '        x'], recurse);
    expect(out?.output).toEqual([
      ':::::tabs',
      '::::tab[A]',
      ':::note[N]',
      'x',
      ':::',
      '::::',
      ':::::',
    ]);
  });

  it('una pestaña con indentación la conserva en todo el grupo', () => {
    const out = run(['  === "A"', '      a']);
    expect(out?.output).toEqual(['  ::::tabs', '  :::tab[A]', '  a', '  :::', '  ::::']);
  });

  it('desescapa las comillas de la etiqueta', () => {
    expect(run(['=== "a \\"b\\""', '    x'])?.output[1]).toBe(':::tab[a "b"]');
  });
});
