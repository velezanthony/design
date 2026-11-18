import { describe, expect, it } from 'vitest';
import { convertApiDirective } from './api-directive.ts';

describe('convertApiDirective', () => {
  it('no actúa sobre otras líneas', () => {
    expect(convertApiDirective(['texto'], 0, 0, undefined)).toBeUndefined();
    expect(convertApiDirective([':::note'], 0, 0, undefined)).toBeUndefined();
  });

  it('sustituye `::: id` por el Markdown generado y consume sus opciones indentadas', () => {
    const lines = ['::: pkg.Class', '    options:', '      show: true', '', 'After'];
    const out = convertApiDirective(lines, 0, 4, (id) => `# ${id}\n\nbody`);
    expect(out).toMatchObject({ output: ['# pkg.Class', '', 'body'], next: 3 });
    expect(out?.log).toEqual([{ kind: 'api', line: 5, detail: 'pkg.Class' }]);
  });

  it('sin referencia generada deja una nota y lo registra', () => {
    const out = convertApiDirective(['::: pkg.Class'], 0, 0, () => undefined);
    expect(out?.output[0]).toBe(':::note[API reference]');
    expect(out?.output[1]).toContain('`pkg.Class`');
    expect(out?.log).toEqual([{ kind: 'api-unresolved', line: 1, detail: 'pkg.Class' }]);
  });

  it('sin resolvedor tampoco falla', () => {
    expect(convertApiDirective(['::: a.b'], 0, 0, undefined)?.log[0]?.kind).toBe('api-unresolved');
  });
});
