import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import SchemasList from './SchemasList.astro';

const schemas = [
  {
    types: ['Organization'],
    source: 'site' as const,
    json: JSON.stringify({ '@type': 'Organization', name: 'Acme' }, null, 2),
  },
  {
    types: ['Person', 'Thing'],
    source: 'page' as const,
    json: JSON.stringify(
      { '@type': ['Person', 'Thing'], name: '</script><b>Ada</b> & co' },
      null,
      2,
    ),
  },
];

describe('SchemasList', () => {
  it('lista cada schema con su @type, su origen y el JSON formateado', async () => {
    const doc = await render(SchemasList, { schemas });
    const items = [...doc.querySelectorAll('[data-schemas] [data-schema]')];
    expect(items).toHaveLength(2);
    expect(text(items[0])).toContain('Organization');
    expect(text(items[0])).toContain('sitio');
    expect(text(items[1])).toContain('Person, Thing');
    expect(text(items[1])).toContain('página');
    expect(items[0]!.querySelector('pre')!.textContent).toBe(schemas[0]!.json);
  });

  it('el JSON va escapado para HTML: no se cuela etiqueta alguna', async () => {
    const doc = await render(SchemasList, { schemas });
    const pre = doc.querySelectorAll('[data-schemas] pre')[1]!;
    expect(pre.querySelector('b')).toBeNull();
    expect(pre.textContent).toContain('</script><b>Ada</b> & co');
  });

  it('sin schemas, el estado vacío', async () => {
    const doc = await render(SchemasList, { schemas: [] });
    expect(text(doc.querySelector('[data-schemas]'))).toContain(
      'Esta página no declara ningún schema.',
    );
  });
});
