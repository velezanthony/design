import { defineMdastPlugin } from 'satteri';

/** Con `features.directive` Sätteri se traga `12:30` o `:cmd[a]`; este plugin va ÚLTIMO y devuelve a texto lo que nadie reclamó. */
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
