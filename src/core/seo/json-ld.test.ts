import { describe, expect, it } from 'vitest';
import type { JsonLd } from '../config/schema';
import { resolveSchemas, serializeJsonLd, withContext } from './json-ld';

const org: JsonLd = { '@type': 'Organization', name: 'Acme' };
const person: JsonLd = { '@type': ['Person', 'Thing'], name: 'Ada' };

describe('withContext', () => {
  it('añade @context de schema.org, el primero, cuando falta', () => {
    const out = withContext(org);
    expect(out['@context']).toBe('https://schema.org');
    expect(Object.keys(out)[0]).toBe('@context');
  });

  it('respeta el @context que el sitio declara', () => {
    const own = { '@context': 'https://example.dev/vocab', '@type': 'Thing' };
    expect(withContext(own)).toEqual(own);
  });

  it('no muta el objeto de entrada', () => {
    withContext(org);
    expect(org).not.toHaveProperty('@context');
  });
});

describe('resolveSchemas: cascada sitio -> página', () => {
  it('sin nada en ningún nivel no hay schemas', () => {
    expect(resolveSchemas(undefined, undefined)).toEqual([]);
  });

  it('página ausente: los del sitio', () => {
    expect(resolveSchemas([org], undefined)).toEqual([
      { schema: withContext(org), source: 'site' },
    ]);
  });

  it('página con lista: los del sitio y después los de la página', () => {
    const out = resolveSchemas([org], [person]);
    expect(out.map((entry) => entry.source)).toEqual(['site', 'page']);
    expect(out[1]?.schema['@type']).toEqual(['Person', 'Thing']);
  });

  it('página con lista y sitio sin nada: solo los de la página', () => {
    expect(resolveSchemas(undefined, [person]).map((entry) => entry.source)).toEqual(['page']);
  });

  it('página `false`: ninguno, ni siquiera los del sitio', () => {
    expect(resolveSchemas([org], false)).toEqual([]);
  });

  it('página con lista vacía: los del sitio (añadir nada no quita nada)', () => {
    expect(resolveSchemas([org], [])).toHaveLength(1);
  });
});

describe('serializeJsonLd', () => {
  it('es JSON válido que vuelve a ser el mismo objeto', () => {
    const schema = withContext(org);
    expect(JSON.parse(serializeJsonLd(schema))).toEqual(schema);
  });

  it('un valor con </script> no puede cerrar el <script> ni abrir otro', () => {
    const hostile = withContext({
      '@type': 'Thing',
      name: '</script><script>alert(1)</script>',
    });
    const out = serializeJsonLd(hostile);
    expect(out).not.toContain('<');
    expect(out).not.toContain('</script');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });

  it('escapa también U+2028 y U+2029 y `&`/`>`', () => {
    const out = serializeJsonLd(withContext({ '@type': 'Thing', name: 'a\u2028b\u2029c & d > e' }));
    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(out).not.toContain('&');
    expect(out).not.toContain('>');
    expect(JSON.parse(out).name).toBe('a\u2028b\u2029c & d > e');
  });
});
