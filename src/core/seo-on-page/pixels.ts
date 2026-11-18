/**
 * Una ESTIMACIÓN del ancho que ocupa un texto en el resultado de búsqueda. Google no recorta por
 * caracteres sino por píxeles, y la fuente exacta cambia de un dispositivo a otro: aquí se usan los
 * anchos de Arial (la sans-serif que más se le parece) y por eso es un orden de magnitud, no una
 * medida. Siempre se enseña como «≈».
 */

/** El tamaño de letra de cada campo en el resultado de escritorio: título ~20 px, descripción ~14 px. */
const FONT_PX = { title: 20, description: 14 } as const;

export type PixelField = keyof typeof FONT_PX;

/** Ancho de un carácter en milésimas de em (Arial). */
const ASCII_WIDTHS: Record<string, number> = {
  ' ': 278,
  '!': 278,
  '"': 355,
  '#': 556,
  $: 556,
  '%': 889,
  '&': 667,
  "'": 191,
  '(': 333,
  ')': 333,
  '*': 389,
  '+': 584,
  ',': 278,
  '-': 333,
  '.': 278,
  '/': 278,
  ':': 278,
  ';': 278,
  '<': 584,
  '=': 584,
  '>': 584,
  '?': 556,
  '@': 1015,
  '[': 278,
  '\\': 278,
  ']': 278,
  '^': 469,
  _: 556,
  '`': 333,
  '{': 334,
  '|': 260,
  '}': 334,
  '~': 584,
  ...Object.fromEntries([...'0123456789'].map((digit) => [digit, 556])),
  ...Object.fromEntries(
    Object.entries({
      A: 667,
      B: 667,
      C: 722,
      D: 722,
      E: 667,
      F: 611,
      G: 778,
      H: 722,
      I: 278,
      J: 500,
      K: 667,
      L: 556,
      M: 833,
      N: 722,
      O: 778,
      P: 667,
      Q: 778,
      R: 722,
      S: 667,
      T: 611,
      U: 722,
      V: 667,
      W: 944,
      X: 667,
      Y: 667,
      Z: 611,
      a: 556,
      b: 556,
      c: 500,
      d: 556,
      e: 556,
      f: 278,
      g: 556,
      h: 556,
      i: 222,
      j: 222,
      k: 500,
      l: 222,
      m: 833,
      n: 556,
      o: 556,
      p: 556,
      q: 556,
      r: 333,
      s: 500,
      t: 278,
      u: 556,
      v: 500,
      w: 722,
      x: 500,
      y: 500,
      z: 500,
    }),
  ),
};

/** Lo que mide un carácter que no está en la tabla (CJK, emoji…): ancho, un em entero. */
const WIDE = 1000;

function widthOf(char: string): number {
  const known = ASCII_WIDTHS[char];
  if (known !== undefined) return known;
  /* Una letra acentuada mide lo que su base: «é» se descompone en «e» y el acento. */
  const base = char.normalize('NFD')[0];
  return (base !== undefined && ASCII_WIDTHS[base]) || WIDE;
}

/** Los píxeles (redondeados) que ocuparía `text` en el campo dado. */
export function estimateWidth(text: string, field: PixelField): number {
  let units = 0;
  for (const char of text) units += widthOf(char);
  return Math.round((units / 1000) * FONT_PX[field]);
}
