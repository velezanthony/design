import { describe, expect, it } from 'vitest';
import { convertFence } from './fences.ts';

describe('convertFence', () => {
  it('no actúa si la línea no abre un fence', () => {
    expect(convertFence(['texto'], 0, 0)).toBeUndefined();
  });

  it('consume el fence entero sin tocar su contenido', () => {
    const lines = ['```md', '!!! note', '=== "A"', '```', 'fuera'];
    expect(convertFence(lines, 0, 0)).toEqual({ output: lines.slice(0, 4), next: 4, log: [] });
  });

  it('un fence más largo solo lo cierra otro igual de largo o más', () => {
    const lines = ['````', '```', 'x', '```', '````', 'fuera'];
    expect(convertFence(lines, 0, 0)?.next).toBe(5);
  });

  it('un fence sin cerrar llega hasta el final', () => {
    const lines = ['~~~', 'x', 'y'];
    expect(convertFence(lines, 0, 0)).toMatchObject({ output: lines, next: 3 });
  });

  it('etiqueta con `console` el bloque sin lenguaje que empieza por una orden', () => {
    const out = convertFence(['```', '$ ls', '```'], 0, 4);
    expect(out?.output).toEqual(['```console', '$ ls', '```']);
    expect(out?.log).toEqual([{ kind: 'code-language', line: 5, detail: 'none -> console' }]);
  });

  it('cambia `text` por `sql` si empieza por una sentencia', () => {
    const out = convertFence(['  ```text', '  SELECT 1;', '  ```'], 0, 0);
    expect(out?.output).toEqual(['  ```sql', '  SELECT 1;', '  ```']);
    expect(out?.log[0]?.detail).toBe('text -> sql');
  });

  it('nunca adivina: ante la duda deja la etiqueta como está', () => {
    expect(convertFence(['```', 'x = 1', '```'], 0, 0)?.output).toEqual(['```', 'x = 1', '```']);
    expect(convertFence(['```python', '$ ls', '```'], 0, 0)?.log).toEqual([]);
  });

  it('no etiqueta un bloque que no se cierra', () => {
    expect(convertFence(['```', '$ ls'], 0, 0)?.log).toEqual([]);
  });
});
