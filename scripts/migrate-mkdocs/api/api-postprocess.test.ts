import { describe, expect, it } from 'vitest';
import { cleanGeneratedApi } from './api-postprocess.ts';

describe('cleanGeneratedApi', () => {
  it('quita los enlaces internos `#ancla` que griffe2md no puede respaldar con un id', () => {
    const out = cleanGeneratedApi('- [**close**](#a.b.close) – Closes.\nSee [Foo](#a.Foo).');
    expect(out.markdown).toBe('- **close** – Closes.\nSee Foo.');
    expect(out.stripped).toBe(2);
  });

  it('convierte `<code>…</code>` en código en línea', () => {
    expect(
      cleanGeneratedApi('Bases: <code>[Enum](#enum.Enum)</code>, <code>str</code>').markdown,
    ).toBe('Bases: `Enum`, `str`');
  });

  it('no toca los bloques de código ni los enlaces externos', () => {
    const src = '```python\nx = [a](#b)\n```\n[ok](https://x.dev) [rel](./a.md#z)';
    expect(cleanGeneratedApi(src).markdown).toBe(src);
  });
});
