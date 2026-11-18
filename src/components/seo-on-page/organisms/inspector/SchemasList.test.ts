import { describe, expect, it } from 'vitest';
import { render, text } from '../../../../testing/render';
import SchemasList from './SchemasList.astro';

const schemas = [
  { types: ['Organization'], source: 'site', json: '{\n  "@type": "Organization"\n}', pages: 38 },
  { types: ['Person', 'Thing'], source: 'page', json: '{"a":1}', pages: undefined },
];

describe('SchemasList', () => {
  it('cada schema va plegado en un <details> con su tipo y de dónde viene', async () => {
    const htmlDocument = await render(SchemasList, { schemas });
    const items = [...htmlDocument.querySelectorAll('[data-schemas] details[data-schema]')];
    expect(items).toHaveLength(2);
    expect(items.some((item) => item.hasAttribute('open'))).toBe(false);
    expect(text(items[0]!.querySelector('summary'))).toContain('Organization');
    expect(text(items[0]!.querySelector('summary'))).toContain('Del sitio');
    expect(text(items[1]!.querySelector('summary'))).toContain('Person, Thing');
    expect(text(items[1]!.querySelector('summary'))).toContain('De la página');
  });

  it('el del sitio dice en cuántas páginas está; el de la página, no', async () => {
    const htmlDocument = await render(SchemasList, { schemas });
    const [site, own] = [...htmlDocument.querySelectorAll('summary')];
    expect(text(site!)).toContain('en las 38 páginas');
    expect(text(own!)).not.toContain('en las');
  });

  it('desplegado enseña el JSON tal cual', async () => {
    const htmlDocument = await render(SchemasList, { schemas });
    expect(htmlDocument.querySelectorAll('[data-schemas] pre')[0]!.textContent).toBe(
      schemas[0]!.json,
    );
  });

  it('sin schemas lo dice', async () => {
    const htmlDocument = await render(SchemasList, { schemas: [] });
    expect(text(htmlDocument.querySelector('[data-schemas]'))).toContain(
      'no declara ningún schema',
    );
  });
});
