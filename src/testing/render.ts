import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parseHTML } from 'linkedom';

type Component = Parameters<AstroContainer['renderToString']>[0];
type Options = NonNullable<Parameters<AstroContainer['renderToString']>[1]>;

let container: AstroContainer | undefined;

/** Renderiza un componente como lo haría una página y devuelve un documento consultable. */
export async function render(component: Component, props: Options['props'] = {}) {
  container ??= await AstroContainer.create();
  const html = await container.renderToString(component, { props });
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
}

type Node = { textContent: string | null };

/** Texto visible con el espacio colapsado, como lo leería una persona. El `textContent` de un
    documento es siempre null por especificación, así que lee el del `body`. */
export const text = (node: Node | { body: Node } | null) => {
  const source = node && 'body' in node ? node.body : node;
  return source?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
};
