import { RAIL_QUERY } from './rail';

/**
 * Script en línea que deja el menú plegado por debajo del raíl y abierto desde él, antes del primer
 * pintado. Va en línea y no puede importar, así que la consulta se interpola. Actúa sobre el
 * hermano anterior del `<script>`.
 */
export function navOpenScript(): string {
  return `(() => {
  const nav = document.currentScript.previousElementSibling;
  const wide = matchMedia(${JSON.stringify(RAIL_QUERY)});
  const sync = () => {
    nav.open = wide.matches;
  };
  sync();
  wide.addEventListener('change', sync);
})();`;
}
