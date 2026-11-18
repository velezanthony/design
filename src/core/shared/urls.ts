/** La `base` del sitio sin barras finales: `/repo/` → `/repo`, y la raíz `/` → `''`. */
export function trimBase(base: string): string {
  return base.replace(/\/+$/, '');
}

/** Una ruta (que empieza por `/`) bajo la base del sitio. */
export function withBase(base: string, path: string): string {
  return `${trimBase(base)}${path}`;
}

/** La base acabada en una sola barra: `/repo` → `/repo/`, `/` → `/`. */
export function baseUrl(base: string): string {
  return `${trimBase(base)}/`;
}
