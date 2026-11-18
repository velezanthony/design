/** Rellena las `{variable}` de una plantilla; el cliente no puede importar `t()` de core. */
export function fill(template: string, variables: Record<string, string>): string {
  return template.replace(
    /\{(\w+)\}/g,
    (placeholder, name: string) => variables[name] ?? placeholder,
  );
}
