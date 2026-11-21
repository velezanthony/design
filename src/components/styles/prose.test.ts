import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/components/styles/prose.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Declaraciones propias de `@utility prose { ... }`, sin las reglas anidadas. */
function ownDeclarations(source: string): string {
  const start = source.indexOf('{', source.indexOf('@utility prose')) + 1;
  let depth = 1;
  let own = '';
  for (let index = start; index < source.length && depth > 0; index++) {
    const char = source[index];
    if (char === '{') depth++;
    else if (char === '}') depth--;
    else if (depth === 1) own += char;
  }
  return own;
}

describe('prose', () => {
  /* A long unbroken word (an error code, an identifier, a URL) in a heading or a paragraph must
     wrap instead of pushing the page sideways on a phone. */
  it('parte las palabras largas en títulos y texto', () => {
    expect(ownDeclarations(css)).toMatch(/overflow-wrap:\s*break-word/);
  });
});
