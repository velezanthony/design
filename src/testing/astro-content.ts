import { docsSchema } from '../astro/loader/schema';

type DocData = ReturnType<typeof docsSchema> extends { _output: infer T } ? T : never;
type DocsInput = readonly [id: string, data: unknown, body?: string];

export interface MockEntry {
  id: string;
  collection: 'docs';
  data: DocData;
  body: string | undefined;
}

/**
 * Sustituto de `astro:content` para probar adaptadores sin build (modelo de Starlight). Cada
 * entrada se valida con el `docsSchema()` real, así los datos de prueba no pueden divergir del
 * contrato. Se usa con `vi.mock('astro:content', () => mockedAstroContent({ docs: [...] }))`.
 */
export function mockedAstroContent({ docs }: { docs: DocsInput[] }) {
  const schema = docsSchema();
  const entries: MockEntry[] = docs.map(([id, data, body]) => ({
    id,
    collection: 'docs',
    data: schema.parse(data) as DocData,
    body,
  }));
  return {
    getCollection: async (_collection: 'docs', filter?: (entry: MockEntry) => boolean) =>
      filter ? entries.filter(filter) : [...entries],
    getEntry: async (_collection: 'docs', id: string) => entries.find((e) => e.id === id),
  };
}
