/** Cuánto ocupa un texto: lo que decide si cabe en una conversación con una IA. */
export interface TextSize {
  lines: number;
  bytes: number;
  /** ESTIMACIÓN: ≈4 caracteres por token, redondeada a 50. El tokenizador real depende del modelo. */
  tokens: number;
}

const CHARS_PER_TOKEN = 4;
const ROUND_TO = 50;

export function estimateSize(text: string): TextSize {
  const chars = [...text].length;
  const raw = chars / CHARS_PER_TOKEN;
  return {
    lines: text.split('\n').length,
    bytes: new TextEncoder().encode(text).length,
    // Nunca 0: un texto no vacío ocupa al menos un tramo.
    tokens: Math.max(ROUND_TO, Math.round(raw / ROUND_TO) * ROUND_TO),
  };
}

/** «78 líneas · 3,2 KB · ≈800 tokens (estimado)»; los tokens van como estimación a la vista. */
export function sizeLabel({ lines, bytes, tokens }: TextSize): string {
  const kb = (bytes / 1024).toFixed(1).replace('.', ',');
  return `${lines} ${lines === 1 ? 'línea' : 'líneas'} · ${kb} KB · ≈${tokens} tokens (estimado)`;
}
