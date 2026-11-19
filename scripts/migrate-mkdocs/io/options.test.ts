import { describe, expect, it } from 'vitest';
import { checkOptions } from './options.ts';

describe('checkOptions', () => {
  it('modo carpeta: exige --repo, --out y --repo-url', () => {
    expect(checkOptions({ repo: 'r', out: 'o', 'repo-url': 'u' })).toBeUndefined();
    expect(checkOptions({ out: 'o', 'repo-url': 'u' })).toMatch(/--repo/);
    expect(checkOptions({ repo: 'r', 'repo-url': 'u' })).toMatch(/--out/);
    expect(checkOptions({ repo: 'r', out: 'o' })).toMatch(/--repo-url/);
  });

  it('--in-place solo necesita --repo', () => {
    expect(checkOptions({ repo: 'r', 'in-place': true })).toBeUndefined();
    expect(checkOptions({ 'in-place': true })).toMatch(/--repo/);
  });

  it('--in-place es incompatible con --out', () => {
    const message = checkOptions({ repo: 'r', 'in-place': true, out: 'o' });
    expect(message).toMatch(/--in-place/);
    expect(message).toMatch(/--out/);
  });

  it.each(['repo-url', 'external', 'external-out', 'sidebar-out'])(
    '--in-place rechaza --%s, que no usa',
    (name) => {
      const value = name === 'external' ? ['x'] : 'x';
      expect(checkOptions({ repo: 'r', 'in-place': true, [name]: value })).toMatch(
        new RegExp(`--${name}`),
      );
    },
  );

  it('--in-place admite --api, --dry-run y --config-out', () => {
    expect(
      checkOptions({
        repo: 'r',
        'in-place': true,
        api: 'api.json',
        'dry-run': true,
        'config-out': 'c.mjs',
      }),
    ).toBeUndefined();
  });

  it('el modo carpeta admite --dry-run y --config-out', () => {
    expect(
      checkOptions({ repo: 'r', out: 'o', 'repo-url': 'u', 'dry-run': true, 'config-out': 'c' }),
    ).toBeUndefined();
  });

  it('--in-place admite --force y --report', () => {
    expect(
      checkOptions({ repo: 'r', 'in-place': true, force: true, report: 'r.json' }),
    ).toBeUndefined();
  });

  it('--force solo tiene sentido con --in-place', () => {
    expect(checkOptions({ repo: 'r', out: 'o', 'repo-url': 'u', force: true })).toMatch(/--force/);
  });

  it('una lista vacía de --external no cuenta como pasada', () => {
    expect(checkOptions({ repo: 'r', 'in-place': true, external: [] })).toBeUndefined();
  });
});
