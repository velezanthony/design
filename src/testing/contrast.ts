/** Luminancia relativa WCAG de `#rgb`, `#rrggbb` o `#rrggbbaa` (el alfa se ignora). */
export function luminance(hex: string): number {
  let digits = hex.slice(1);
  if (digits.length === 3) digits = [...digits].map((digit) => digit + digit).join('');
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Ratio de contraste WCAG entre dos colores, en cualquier orden. */
export function contrast(first: string, second: string): number {
  const [hi, lo] = [luminance(first), luminance(second)].sort((left, right) => right - left) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}
