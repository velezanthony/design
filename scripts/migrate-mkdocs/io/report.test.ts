import { describe, expect, it } from 'vitest';
import {
  formatLeftovers,
  formatPlan,
  formatStubLinks,
  formatStubs,
  formatSummary,
  stubSlug,
} from './report.ts';

describe('formatLeftovers', () => {
  it('una línea por resto con `fichero:línea  tipo  vista previa`', () => {
    expect(
      formatLeftovers([{ file: 'docs/a.md', line: 7, kind: 'tab', preview: '=== "A"' }]),
    ).toEqual(['docs/a.md:7  tab  === "A"']);
  });

  it('sin restos no devuelve nada', () => {
    expect(formatLeftovers([])).toEqual([]);
  });
});

describe('stubSlug', () => {
  it.each([
    ['changelog.md', 'changelog'],
    ['changelog.es.md', 'changelog'],
    ['about/license.md', 'about/license'],
    ['Release Notes.md', 'release-notes'],
  ])('%s -> %s', (file, slug) => {
    expect(stubSlug(file)).toBe(slug);
  });
});

describe('formatStubs', () => {
  it('explica qué incluye cada stub y la entrada `external` exacta que añadir', () => {
    const text = formatStubs([{ file: 'changelog.md', include: 'CHANGELOG.md' }], 'docs').join(
      '\n',
    );
    expect(text).toContain('docs/changelog.md');
    expect(text).toContain('CHANGELOG.md');
    expect(text).toContain("{ slug: 'changelog', file: '../CHANGELOG.md' }");
    expect(text).toMatch(/borra/i);
  });

  it('sin stubs no devuelve nada', () => {
    expect(formatStubs([], 'docs')).toEqual([]);
  });
});

describe('formatSummary', () => {
  const base = {
    scanned: 5,
    changed: ['a.md', 'b.md'],
    log: {
      'a.md': [
        { kind: 'icon', line: 1, detail: 'x' },
        { kind: 'icon', line: 2, detail: 'y' },
      ],
    },
    stubs: [],
    leftovers: [],
  } as const;

  it('cuenta ficheros cambiados y conversiones por tipo, solo los que han ocurrido', () => {
    const text = formatSummary(base as never).join('\n');
    expect(text).toContain('2 de 5');
    expect(text).toMatch(/iconos quitados.*2/);
    expect(text).not.toMatch(/pestañas/);
  });

  it('indica el siguiente paso con git diff docs/', () => {
    expect(formatSummary(base as never).join('\n')).toContain('git diff docs/');
  });

  it('con restos o stubs lo dice, y sin ellos dice que no hay', () => {
    const clean = formatSummary(base as never).join('\n');
    expect(clean).toMatch(/restos.*0|sin restos/i);
    const dirty = formatSummary({
      ...base,
      leftovers: [{ file: 'a.md', line: 1, kind: 'icon', preview: 'x' }],
      stubs: [{ file: 'c.md', include: 'C.md' }],
    } as never).join('\n');
    expect(dirty).toMatch(/restos.*1/i);
    expect(dirty).toMatch(/stubs.*1/i);
  });
});

describe('formatStubLinks', () => {
  it('una línea por enlace con su sustitución', () => {
    expect(
      formatStubLinks([{ file: 'a/b.md', line: 4, href: '../c.md', suggestion: '../../C.md' }]),
    ).toEqual(['docs/a/b.md:4  ../c.md  ->  ../../C.md']);
  });
});

describe('formatPlan', () => {
  it('una línea por fichero con lo que cambiaría en él', () => {
    const log = {
      'a.md': [
        { kind: 'link' as const, line: 1, detail: '' },
        { kind: 'link' as const, line: 2, detail: '' },
        { kind: 'tabs' as const, line: 3, detail: '' },
      ],
    };
    expect(formatPlan(['a.md', 'b.md'], log)).toEqual([
      '  a.md  enlaces reescritos: 2, grupos de pestañas: 1',
      '  b.md',
    ]);
  });
});

describe('formatSummary: dry-run', () => {
  const input = { scanned: 3, changed: ['a.md'], log: {}, stubs: [], leftovers: [] };

  it('habla en condicional y no manda a `git diff`', () => {
    const text = formatSummary({ ...input, dryRun: true }).join('\n');
    expect(text).toContain('Ficheros que cambiarían: 1 de 3');
    expect(text).not.toContain('git diff');
    expect(text).toContain('--dry-run');
  });

  it('sin dry-run sigue diciendo cómo revisar el diff', () => {
    expect(formatSummary(input).join('\n')).toContain('git diff docs/');
  });
});
