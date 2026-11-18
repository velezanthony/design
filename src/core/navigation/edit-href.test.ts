import { describe, expect, it } from 'vitest';
import { editHref } from './edit-href';

describe('editHref', () => {
  it('une la base y el archivo', () => {
    expect(editHref('https://github.com/o/r/edit/main', 'docs/a.md')).toBe(
      'https://github.com/o/r/edit/main/docs/a.md',
    );
  });

  it('no duplica las barras finales de la base ni las iniciales del archivo', () => {
    expect(editHref('https://github.com/o/r/edit/main//', '/docs/a.md')).toBe(
      'https://github.com/o/r/edit/main/docs/a.md',
    );
  });
});
