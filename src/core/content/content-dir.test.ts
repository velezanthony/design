import { describe, expect, it } from 'vitest';
import { contentDirProblem, DEFAULT_CONTENT_DIR, normalizePath } from './content-dir';

describe('normalizePath', () => {
  it('el valor por defecto es el de siempre', () => {
    expect(DEFAULT_CONTENT_DIR).toBe('src/content/docs');
  });

  it.each([
    ['../docs', '../docs'],
    ['./docs/', 'docs'],
    ['docs//guias/', 'docs/guias'],
    ['../site/../docs', '../docs'],
    ['../../docs', '../../docs'],
  ])('«%s» -> «%s»', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
});

describe('contentDirProblem', () => {
  it.each(['../docs', 'docs', 'src/content/docs', './docs/'])('«%s» es válida', (value) => {
    expect(contentDirProblem(value)).toBeUndefined();
  });

  it.each([
    ['https://example.dev/docs', 'URL'],
    ['/home/a/docs', 'absoluta'],
    ['C:\\docs', 'absoluta'],
    ['', 'vacía'],
    ['.', 'raíz del proyecto'],
    ['./', 'raíz del proyecto'],
    ['docs/..', 'raíz del proyecto'],
  ])('«%s» se rechaza (%s)', (value) => {
    expect(contentDirProblem(value)).toBeTypeOf('string');
  });
});
