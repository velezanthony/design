import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { withTransition } from './transition';

/** Un documento cuyo `startViewTransition` ejecuta el callback y acaba al instante. */
const page = (withApi: boolean) => {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  const doc = document;
  const seen: { kind?: string; vars: Record<string, string> }[] = [];
  const start = vi.fn((update: () => void | Promise<void>) => {
    const root = doc.documentElement;
    seen.push({ kind: root.dataset.transition, vars: { x: root.style.getPropertyValue('--x') } });
    void update();
    return { finished: Promise.resolve() };
  });
  if (withApi) Object.assign(doc, { startViewTransition: start });
  return { doc, start, seen };
};

const motion = { matches: false };
const reduced = { matches: true };

describe('withTransition', () => {
  it('usa la API cuando existe y el movimiento está permitido', async () => {
    const { doc, start } = page(true);
    const update = vi.fn();
    await withTransition(update, { doc, motion });
    expect(start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it('sin la API ejecuta el cambio al instante', async () => {
    const { doc } = page(false);
    const update = vi.fn();
    const done = withTransition(update, { doc, motion });
    expect(update).toHaveBeenCalledOnce();
    await done;
  });

  it('con movimiento reducido no anima aunque exista la API', async () => {
    const { doc, start } = page(true);
    const update = vi.fn();
    const done = withTransition(update, { doc, motion: reduced });
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
    await done;
  });

  it('lee la preferencia en cada llamada, no al configurarla', async () => {
    const { doc, start } = page(true);
    const pref = { matches: false };
    await withTransition(vi.fn(), { doc, motion: pref });
    pref.matches = true;
    await withTransition(vi.fn(), { doc, motion: pref });
    expect(start).toHaveBeenCalledOnce();
  });

  it('marca el tipo y las variables durante la transición y los quita al acabar', async () => {
    const { doc, seen } = page(true);
    const done = withTransition(vi.fn(), {
      doc,
      motion,
      kind: 'theme',
      vars: { '--x': '10px' },
    });
    expect(seen[0]).toEqual({ kind: 'theme', vars: { x: '10px' } });
    await done;
    expect(doc.documentElement.dataset.transition).toBeUndefined();
    expect(doc.documentElement.style.getPropertyValue('--x')).toBe('');
  });

  it('sin la API no deja marcas en <html>', async () => {
    const { doc } = page(false);
    await withTransition(vi.fn(), { doc, motion, kind: 'theme', vars: { '--x': '1px' } });
    expect(doc.documentElement.dataset.transition).toBeUndefined();
    expect(doc.documentElement.style.getPropertyValue('--x')).toBe('');
  });

  it('una transición que falla no deja la marca puesta ni propaga el error', async () => {
    const { doc } = page(true);
    Object.assign(doc, {
      startViewTransition: () => ({ finished: Promise.reject(new Error('skipped')) }),
    });
    await expect(withTransition(vi.fn(), { doc, motion, kind: 'tabs' })).resolves.toBeUndefined();
    expect(doc.documentElement.dataset.transition).toBeUndefined();
  });

  it('la limpieza de una transición vieja no pisa la marca de la nueva', async () => {
    const { doc } = page(true);
    let finishFirst!: () => void;
    let calls = 0;
    Object.assign(doc, {
      startViewTransition: () => ({
        finished:
          ++calls === 1
            ? new Promise<void>((resolve) => (finishFirst = resolve))
            : new Promise<void>(() => {}),
      }),
    });
    const first = withTransition(vi.fn(), { doc, motion, kind: 'theme' });
    void withTransition(vi.fn(), { doc, motion, kind: 'zoom' });
    finishFirst();
    await first;
    expect(doc.documentElement.dataset.transition).toBe('zoom');
  });
});
