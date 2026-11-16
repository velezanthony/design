import { describe, expect, it } from 'vitest';
import { fenceMask } from './fences';

describe('fenceMask', () => {
  it('marca solo las líneas dentro de un fence ``` (incluidas las del propio fence)', () => {
    const body = ['antes', '```ts', 'código', '```', 'después'].join('\n');
    expect(fenceMask(body)).toEqual([false, true, true, true, false]);
  });

  it('también reconoce fences ~~~', () => {
    const body = ['a', '~~~', 'x', '~~~', 'b'].join('\n');
    expect(fenceMask(body)).toEqual([false, true, true, true, false]);
  });

  it('un fence de un tipo no se cierra con el otro', () => {
    const body = ['```', '~~~', 'x', '```', 'fuera'].join('\n');
    expect(fenceMask(body)).toEqual([true, true, true, true, false]);
  });

  it('el cierre necesita al menos tantos caracteres como la apertura', () => {
    const body = ['````', '```', 'x', '````', 'fuera'].join('\n');
    expect(fenceMask(body)).toEqual([true, true, true, true, false]);
  });

  it('un fence sin cerrar llega hasta el final', () => {
    expect(fenceMask(['a', '```', 'b', 'c'].join('\n'))).toEqual([false, true, true, true]);
  });

  it('admite hasta tres espacios de sangría y una info string', () => {
    const body = ['   ```js title="x"', 'y', '   ```', 'z'].join('\n');
    expect(fenceMask(body)).toEqual([true, true, true, false]);
  });

  it('cuatro espacios es código indentado, no un fence', () => {
    expect(fenceMask(['    ```', 'x'].join('\n'))).toEqual([false, false]);
  });

  it('sin fences todo es false y hay una entrada por línea', () => {
    expect(fenceMask('a\nb\n\nc')).toEqual([false, false, false, false]);
  });

  it('una línea con ``` dentro del texto no abre un fence', () => {
    expect(fenceMask('uso ```x``` aquí\nb')).toEqual([false, false]);
  });
});
