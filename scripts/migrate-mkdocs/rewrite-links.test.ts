import { describe, expect, it } from 'vitest';
import { createLinkRewriter } from './rewrite-links';

const rewriter = createLinkRewriter({
  published: new Set(['index.md', 'users/a.md', 'users/b.es.md', 'img/pic.png']),
  repoBlobUrl: 'https://github.com/o/r/blob/main',
  docsDirInRepo: 'docs',
  externals: new Map([['CHANGELOG.md', '../CHANGELOG.md']]),
});

describe('createLinkRewriter', () => {
  it('deja intactos los enlaces externos, internos y las anclas', () => {
    const rewrite = rewriter('users/a.md');
    expect(rewrite('https://x.dev/a')).toBeUndefined();
    expect(rewrite('mailto:a@b.c')).toBeUndefined();
    expect(rewrite('#anchor')).toBeUndefined();
  });

  it('deja intactos los enlaces a páginas y recursos publicados', () => {
    const rewrite = rewriter('users/a.md');
    expect(rewrite('b.es.md#x')).toBeUndefined();
    expect(rewrite('../index.md')).toBeUndefined();
    expect(rewrite('../img/pic.png')).toBeUndefined();
  });

  it('apunta al repositorio lo que está en docs/ pero no se publica', () => {
    expect(rewriter('users/a.md')('../features.md#top')).toBe(
      'https://github.com/o/r/blob/main/docs/features.md#top',
    );
    expect(rewriter('index.md')('coverage/index.html')).toBe(
      'https://github.com/o/r/blob/main/docs/coverage/index.html',
    );
  });

  it('apunta al repositorio lo que sale de docs/', () => {
    expect(rewriter('users/a.md')('../../src/x.py')).toBe(
      'https://github.com/o/r/blob/main/src/x.py',
    );
  });

  it('enlaza a un fichero externo publicado con su ruta relativa real', () => {
    expect(rewriter('users/a.md')('../../CHANGELOG.md#v1')).toBe('../../CHANGELOG.md#v1');
  });
});
