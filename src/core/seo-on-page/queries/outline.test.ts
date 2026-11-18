import { describe, expect, it } from 'vitest';
import { outline } from './outline';

function heading(depth: number, text = `H${depth}`) {
  return { depth, slug: text.toLowerCase(), text };
}

describe('outline', () => {
  it('sin encabezados no hay esquema', () => {
    expect(outline([])).toEqual([]);
  });

  it('marca el salto al bajar más de un nivel (H2 → H4)', () => {
    const items = outline([heading(1), heading(2), heading(4, 'Hondo')]);
    expect(items.map((item) => item.skipFrom)).toEqual([undefined, undefined, 2]);
  });

  it('subir de nivel no es un salto (H4 → H2)', () => {
    expect(
      outline([heading(1), heading(2), heading(3), heading(4), heading(2, 'Otra')]).some(
        (item) => item.skipFrom,
      ),
    ).toBe(false);
  });

  it('el primer encabezado nunca es un salto, aunque no sea un H1', () => {
    expect(outline([heading(3)])[0]?.skipFrom).toBeUndefined();
  });

  it('conserva el texto, el nivel y el slug', () => {
    expect(outline([heading(2, 'Uso')])[0]).toMatchObject({ depth: 2, text: 'Uso', slug: 'uso' });
  });
});
