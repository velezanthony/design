/** Validación de las opciones de la CLI. Pura: devuelve el mensaje de error, o `undefined`. */

export interface CliOptions {
  repo?: string;
  out?: string;
  'repo-url'?: string;
  api?: string;
  external?: string[];
  'external-out'?: string;
  'sidebar-out'?: string;
  report?: string;
  'in-place'?: boolean;
  force?: boolean;
}

/** Opciones del modo carpeta que `--in-place` no usa: rechazarlas evita ignorarlas en silencio. */
const FOLDER_ONLY = ['repo-url', 'api', 'external', 'external-out', 'sidebar-out'] as const;

export function checkOptions(values: CliOptions): string | undefined {
  if (!values.repo) return 'Falta --repo <raíz del repo>.';

  if (values['in-place']) {
    if (values.out !== undefined) {
      return '--in-place reescribe docs/ en el sitio y no admite --out: usa uno u otro.';
    }
    for (const name of FOLDER_ONLY) {
      const value = values[name];
      if (value !== undefined && value.length > 0) {
        return `--in-place no usa --${name} (solo es del modo --out): quítalo.`;
      }
    }
    return undefined;
  }

  if (values.force) return '--force solo tiene sentido con --in-place.';
  if (!values.out) return 'Falta --out <carpeta de contenido> (o usa --in-place).';
  if (!values['repo-url']) return 'Falta --repo-url <https://github.com/o/r>.';
  return undefined;
}
