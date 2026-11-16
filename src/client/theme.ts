import { THEME_KEY, safeSet } from './storage';

export type Theme = 'dark' | 'light';

/** Colores de la barra del navegador, uno por tema. */
export type ThemeColors = Record<Theme, string>;

/** Un valor guardado o de atributo, si nombra un tema. */
export function parseTheme(value: string | null | undefined): Theme | undefined {
  return value === 'dark' || value === 'light' ? value : undefined;
}

/** Una elección explícita gana; sin ella, decide el sistema. */
export function isDark(chosen: Theme | undefined, systemDark: boolean): boolean {
  return chosen ? chosen === 'dark' : systemDark;
}

/** El tema al que cambia el botón: el contrario de lo que se está viendo. */
export function nextTheme(chosen: Theme | undefined, systemDark: boolean): Theme {
  return isDark(chosen, systemDark) ? 'light' : 'dark';
}

/** El botón enciende y apaga el modo oscuro, así que está pulsado mientras este está encendido. */
export function syncToggle(button: Element, dark: boolean): void {
  button.setAttribute('aria-pressed', String(dark));
}

/**
 * `<meta name="theme-color">` viene en dos, una por preferencia del sistema, así que una elección
 * contraria al sistema dejaría la barra del navegador en el otro tema. Una elección da a ambas
 * su color.
 */
export function syncThemeColor(doc: Document, color: string): void {
  for (const meta of doc.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', color);
  }
}

/**
 * Código del script en línea que se ejecuta antes del primer pintado: sin él la página se pinta
 * con el tema del sistema y luego salta, que es el parpadeo que todo conmutador debe evitar. Va
 * en línea y no puede importar, por eso es una cadena (`<script is:inline set:html={...}>`) con
 * la clave y los colores ya incrustados. Usa `document` y `localStorage` globales.
 */
export function themeBootstrapScript(colors: ThemeColors): string {
  return `try {
  var saved = localStorage.getItem(${JSON.stringify(THEME_KEY)});
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.dataset.theme = saved;
    var colors = ${JSON.stringify(colors)};
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', colors[saved]);
  }
} catch (e) {
  /* Almacenamiento bloqueado: manda el tema del sistema. */
}`;
}

export interface ThemeEnv {
  doc: Document;
  storage: Storage | undefined;
  /** La preferencia del sistema (`matchMedia('(prefers-color-scheme: dark)')`). */
  system: Pick<MediaQueryList, 'matches'> & {
    addEventListener(type: 'change', cb: () => void): void;
  };
  colors: ThemeColors;
}

/** Cablea los botones `[data-theme-toggle]`: cambian el tema, la barra y lo recuerdan. */
export function initTheme({ doc, storage, system, colors }: ThemeEnv): void {
  const root = doc.documentElement;
  const buttons = doc.querySelectorAll('[data-theme-toggle]');
  if (!buttons.length) return;

  const chosen = () => parseTheme(root.dataset.theme);
  const sync = () => {
    for (const button of buttons) syncToggle(button, isDark(chosen(), system.matches));
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const next = nextTheme(chosen(), system.matches);
      root.dataset.theme = next;
      syncThemeColor(doc, colors[next]);
      safeSet(storage, THEME_KEY, next);
      sync();
    });
  }

  /* Sin elección explícita la página sigue al sistema, y el estado pulsado también. */
  system.addEventListener('change', sync);
  sync();
}
