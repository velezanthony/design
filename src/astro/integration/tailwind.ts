import tailwindcss from '@tailwindcss/vite';
import type { PluginOption } from 'vite';

function hasTailwind(option: PluginOption): boolean {
  if (Array.isArray(option)) return option.some(hasTailwind);
  return (
    typeof option === 'object' &&
    option !== null &&
    'name' in option &&
    option.name.startsWith('@tailwindcss/vite')
  );
}

/** Los plugins de Tailwind, salvo que el sitio ya los registrase: dos pasadas duplicarían el CSS. */
export function tailwindPlugins(existing: PluginOption | undefined): PluginOption[] {
  return hasTailwind(existing) ? [] : [tailwindcss()];
}
