import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import SchemasSummary from './SchemasSummary.astro';

describe('SchemasSummary', () => {
  it('cuenta las páginas con y sin schema y lista los @type usados', async () => {
    const schemas = {
      withSchemas: 7,
      withoutSchemas: 3,
      types: [
        { type: 'Organization', pages: 7 },
        { type: 'TechArticle', pages: 2 },
      ],
    };
    const doc = await render(SchemasSummary, { schemas });
    const block = text(doc.querySelector('[data-schemas]'));
    expect(block).toContain('7');
    expect(block).toContain('3');
    expect(block).toContain('Organization');
    expect(block).toContain('TechArticle');
  });

  it('sin ningún schema lo dice, sin inventar tipos', async () => {
    const schemas = { withSchemas: 0, withoutSchemas: 10, types: [] };
    const doc = await render(SchemasSummary, { schemas });
    expect(text(doc.querySelector('[data-schemas]'))).toContain('Ninguna página declara schemas');
  });
});
