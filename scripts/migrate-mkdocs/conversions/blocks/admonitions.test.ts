import { describe, expect, it } from 'vitest';
import { convertAdmonition } from './admonitions';
import type { Recurse } from '../../pipeline/types';

const identity: Recurse = (lines) => ({ output: lines, log: [] });
const run = (lines: string[], recurse = identity) => convertAdmonition(lines, 0, 0, recurse);

describe('convertAdmonition', () => {
  it('no actúa sobre una línea que no es una admonición', () => {
    expect(run(['texto'])).toBeUndefined();
    expect(run(['!!!note-sin-espacio-ni-tipo ""'])).toBeUndefined();
  });

  it('convierte la cabecera y consume solo su cuerpo', () => {
    const out = run(['!!! warning "Careful"', '', '    Body.', '', 'After.']);
    expect(out).toMatchObject({ output: [':::warning[Careful]', 'Body.', ':::'], next: 3 });
    expect(out?.log).toEqual([{ kind: 'admonition', line: 1, detail: '!!! warning -> warning' }]);
  });

  it('el cuerpo pasa por la recursión que le da quien llama, con su desplazamiento', () => {
    const seen: Array<[string[], number]> = [];
    const recurse: Recurse = (lines, offset) => {
      seen.push([lines, offset]);
      return { output: lines.map((row) => row.toUpperCase()), log: [] };
    };
    const out = convertAdmonition(['', '!!! note "N"', '    abc'], 1, 10, recurse);
    expect(seen).toEqual([[['abc'], 12]]);
    expect(out?.output).toEqual([':::note[N]', 'ABC', ':::']);
  });

  it('el registro del cuerpo va antes que el de la admonición', () => {
    const recurse: Recurse = () => ({
      output: ['x'],
      log: [{ kind: 'icon', line: 1, detail: 'i' }],
    });
    const kinds = run(['!!! note "N"', '    x'], recurse)?.log.map((entry) => entry.kind);
    expect(kinds).toEqual(['icon', 'admonition']);
  });

  it('un alias sin título conserva su nombre como título', () => {
    expect(run(['!!! success', '    ok'])?.output).toEqual([':::tip[Success]', 'ok', ':::']);
  });

  it('un alias con título mantiene el título', () => {
    const out = run(['!!! bug "Roto"', '    ok']);
    expect(out?.output[0]).toBe(':::danger[Roto]');
    expect(out?.log.map((entry) => entry.kind)).toEqual(['admonition-alias', 'admonition']);
  });

  it('un tipo desconocido cae a note y se registra', () => {
    const out = run(['!!! zzz "T"', '    x']);
    expect(out?.output[0]).toBe(':::note[T]');
    expect(out?.log.map((entry) => entry.kind)).toContain('admonition-unknown');
  });

  it('sin título y con equivalente 1:1 sale como alerta de GitHub', () => {
    const out = run(['!!! note', '    One.', '', '    Two.']);
    expect(out?.output).toEqual(['> [!NOTE]', '> One.', '>', '> Two.']);
    expect(out?.log[0]).toMatchObject({ kind: 'alert', detail: 'note -> [!NOTE]' });
  });

  it('`???` es plegada, `???+` abierta, y ninguna es alerta', () => {
    expect(run(['??? tip "H"', '    x'])?.output[0]).toBe(':::tip[H]{collapsed}');
    expect(run(['??? tip "H"', '    x'])?.log.map((entry) => entry.kind)).toContain('collapsed');
    expect(run(['???+ tip "H"', '    x'])?.output[0]).toBe(':::tip[H]');
    expect(run(['??? tip', '    x'])?.output[0]).toBe(':::tip{collapsed}');
  });

  it('una admonición con indentación conserva el prefijo en cada línea', () => {
    const out = run(['    !!! note "N"', '        x']);
    expect(out?.output).toEqual(['    :::note[N]', '    x', '    :::']);
  });

  it('una alerta con indentación prefija también el `>`', () => {
    expect(run(['  !!! tip', '      x'])?.output).toEqual(['  > [!TIP]', '  > x']);
  });

  it('si el cuerpo ya trae directivas, sube los dos puntos y no usa alerta', () => {
    const recurse: Recurse = () => ({ output: [':::warning[I]', 'deep', ':::'], log: [] });
    const out = run(['!!! note', '    !!! warning "I"', '        deep'], recurse);
    expect(out?.output).toEqual(['::::note', ':::warning[I]', 'deep', ':::', '::::']);
  });

  it('desescapa las comillas del título', () => {
    expect(run(['!!! warning "a \\"b\\""', '    x'])?.output[0]).toBe(':::warning[a "b"]');
  });
});
