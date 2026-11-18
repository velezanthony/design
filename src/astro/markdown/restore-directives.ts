import { defineMdastPlugin } from 'satteri';

/**
 * Con `features.directive` activo Sätteri trata `x:y`, `12:30` o `:cmd[a]` como directivas de
 * texto y se las traga. Este plugin va el ÚLTIMO de la lista: lo que ningún plugin anterior
 * reclamó se devuelve a texto, copiando el trozo exacto del fuente.
 */
export const restoreDirectives = defineMdastPlugin({
  name: 'restore-directives',
  options: { position: true },
  textDirective(node, context) {
    restore(node, context);
  },
  leafDirective(node, context) {
    restore(node, context);
  },
});

function restore(
  node: { position?: { start: { offset?: number }; end: { offset?: number } } },
  context: {
    source: string;
    replaceNode(node: never, newNode: { type: 'text'; value: string }): void;
  },
): void {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return;
  context.replaceNode(node as never, { type: 'text', value: context.source.slice(start, end) });
}
