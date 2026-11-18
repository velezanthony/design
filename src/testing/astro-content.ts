import { docsSchema, type DocEntryData } from '../astro/loader/schema';
type DocsInput = readonly [id: string, data: unknown, body?: string];

export interface MockEntry {
  id: string;
  collection: 'docs';
  data: DocEntryData;
  body: string | undefined;
}

/** Sustituto de `astro:content` para probar adaptadores sin build; valida cada entrada con el `docsSchema()` real. */
export function mockedAstroContent({ docs }: { docs: DocsInput[] }) {
  const schema = docsSchema();
  const entries: MockEntry[] = docs.map(([id, data, body]) => ({
    id,
    collection: 'docs',
    data: schema.parse(data) as DocEntryData,
    body,
  }));
  return {
    getCollection: async (_collection: 'docs', filter?: (entry: MockEntry) => boolean) =>
      filter ? entries.filter(filter) : [...entries],
    getEntry: async (_collection: 'docs', id: string) => entries.find((entry) => entry.id === id),
  };
}
