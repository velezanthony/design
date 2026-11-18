import { RAIL_QUERY } from './rail';

/** Script en línea (por eso la consulta se interpola) que pliega el menú por debajo del raíl y lo abre desde él, antes del primer pintado. */
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
