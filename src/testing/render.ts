import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parseHTML } from 'linkedom';

type Component = Parameters<AstroContainer['renderToString']>[0];
type Options = NonNullable<Parameters<AstroContainer['renderToString']>[1]>;

let container: AstroContainer | undefined;

/** Renderiza un componente como lo haría una página y devuelve un documento consultable. `slots`
    son los fragmentos HTML de sus ranuras (`default` es la ranura sin nombre). */
export async function render(
  component: Component,
  props: Options['props'] = {},
  slots: Options['slots'] = {},
) {
  container ??= await AstroContainer.create();
  const html = await container.renderToString(component, { props, slots });
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
}

type Node = { textContent: string | null };

/** Texto visible con el espacio colapsado, como lo leería una persona. El `textContent` de un
    documento es siempre null por especificación, así que lee el del `body`. */
export function text(node: Node | { body: Node } | null) {
  const source = node && 'body' in node ? node.body : node;
  return source?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Como `render`, pero para un componente que ES un documento (`<html>…`): se analiza tal cual. */
export async function renderDocument(
  component: Component,
  props: Options['props'] = {},
  slots: Options['slots'] = {},
) {
  container ??= await AstroContainer.create();
  const html = await container.renderToString(component, { props, slots });
  return parseHTML(html).document;
}
