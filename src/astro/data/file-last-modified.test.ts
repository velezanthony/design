import { describe, expect, it, vi } from 'vitest';
import { createFileLastModified } from './file-last-modified';

describe('createFileLastModified', () => {
  it('devuelve la fecha del archivo que pide, relativo a la raíz', async () => {
    const datesOf = vi.fn(async () => new Map([['src/a.md', '2026-02-02T10:00:00+00:00']]));
    const fileLastModified = createFileLastModified(datesOf);
    expect(await fileLastModified('src/a.md', '/repo')).toBe('2026-02-02T10:00:00+00:00');
    expect(datesOf).toHaveBeenCalledWith('/repo', ['src/a.md']);
  });

  it('sin fecha (clon superficial o archivo que no existe) devuelve undefined', async () => {
    const fileLastModified = createFileLastModified(async () => new Map());
    expect(await fileLastModified('src/a.md', '/repo')).toBeUndefined();
  });

  it('por defecto la raíz es el directorio de trabajo, donde Astro corre el build', async () => {
    const datesOf = vi.fn(async () => new Map<string, string>());
    await createFileLastModified(datesOf)('src/a.md');
    expect(datesOf).toHaveBeenCalledWith(process.cwd(), ['src/a.md']);
  });
});
