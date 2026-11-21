import { safeGet, safeSet, INDEX_PER_PAGE_KEY } from '../preferences/storage';

/* El selector «Por página» de un índice generado (tarjetas y tabla). Es una mejora progresiva: sin
   JavaScript el selector está oculto y el índice usa sus rutas estáticas (`/carpeta/`, `/carpeta/2/`).
   Con él, la página 1 ya trae todas las entradas y un paginador por cada tamaño y página, pintados
   por los componentes del servidor: aquí solo se decide qué se ve (`hidden`), sin crear marcado. El
   estado vive en la URL (`?por=18&pagina=2`) y el tamaño elegido, en `localStorage` por índice. */

/** Lo que se ve: cuántas por página y cuál. */
export interface PagerState {
  perPage: number;
  page: number;
}

/** Nombres de la query (los pone el servidor en `data-param-*`). */
export interface PagerParams {
  perPage: string;
  page: string;
}

/** El estado de una query: un tamaño que no es una opción vuelve al de la config y la página se acota a las que hay. */
export function readState(
  search: string,
  params: PagerParams,
  options: readonly number[],
  defaultPerPage: number,
  total: number,
): PagerState {
  const query = new URLSearchParams(search);
  const asked = Number(query.get(params.perPage));
  const perPage = options.includes(asked) ? asked : defaultPerPage;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const wanted = Math.trunc(Number(query.get(params.page)) || 1);
  return { perPage, page: Math.min(Math.max(wanted, 1), pages) };
}

/** La URL de un estado: limpia con el tamaño de la config en la página 1; si no, con la query. */
export function stateUrl(
  pathname: string,
  state: PagerState,
  defaultPerPage: number,
  params: PagerParams,
): string {
  if (state.perPage === defaultPerPage && state.page === 1) return pathname;
  const page = state.page === 1 ? '' : `&${params.page}=${state.page}`;
  return `${pathname}?${params.perPage}=${state.perPage}${page}`;
}

/** Primera y última entrada visibles, contando desde 1. */
export function visibleRange(state: PagerState, total: number): { from: number; to: number } {
  const from = (state.page - 1) * state.perPage + 1;
  return { from: Math.min(from, total), to: Math.min(state.page * state.perPage, total) };
}

/** Lo que el selector necesita del navegador; inyectable para probarlo sin globales. */
export interface PagerEnv {
  storage: Storage | undefined;
  location: Pick<Location, 'href' | 'pathname' | 'search' | 'assign'>;
  history?: Pick<History, 'pushState' | 'replaceState'>;
  browserWindow?: Pick<Window, 'addEventListener'>;
}

/** Marca la opción `value` (vía `option.selected`, que también admite el DOM de los tests). */
function selectValue(select: HTMLSelectElement, value: number): void {
  /* En un `<select>` simple, marcar una deselecciona las demás; se quita antes el atributo porque
     el DOM de los tests (linkedom) no lo hace solo. */
  for (const option of select.querySelectorAll('option')) {
    option.removeAttribute('selected');
    if (option.value === String(value)) option.selected = true;
  }
}

/** Cablea cada índice con selector de la página. */
export function initIndexPager(htmlDocument: Document, env: PagerEnv): void {
  for (const root of htmlDocument.querySelectorAll<HTMLElement>('[data-index-pager]')) {
    initPager(root, env);
  }
}

function initPager(root: HTMLElement, env: PagerEnv): void {
  const data = root.dataset;
  const select = root.querySelector<HTMLSelectElement>('select[data-index-per-page]');
  const field = root.querySelector<HTMLElement>('[data-index-per-page-field]');
  if (!select || !field) return;
  const defaultPerPage = Number(data.perPage);
  const options = (data.options ?? '').split(',').map(Number).filter(Boolean);
  const total = Number(data.total);
  const folder = data.folder ?? env.location.pathname;
  const key = `${INDEX_PER_PAGE_KEY}:${data.key ?? folder}`;
  const params: PagerParams = { perPage: data.paramPer ?? 'por', page: data.paramPage ?? 'pagina' };
  field.hidden = false;
  selectValue(select, defaultPerPage);

  if (data.all !== 'true') {
    /* Las páginas 2 y siguientes solo traen sus entradas: cambiar el tamaño lleva a la carpeta. */
    select.addEventListener('change', () => {
      const perPage = Number(select.value);
      safeSet(env.storage, key, String(perPage));
      env.location.assign(stateUrl(folder, { perPage, page: 1 }, defaultPerPage, params));
    });
    return;
  }

  const items = [...root.querySelectorAll<HTMLElement>('[data-index-item]')];
  const pagers = [...root.querySelectorAll<HTMLElement>('[data-index-pagination]')];
  const status = root.querySelector<HTMLElement>('[data-index-status]');

  function apply(state: PagerState, announce: boolean) {
    const start = (state.page - 1) * state.perPage;
    items.forEach((item, position) => {
      item.hidden = position < start || position >= start + state.perPage;
    });
    for (const pager of pagers) {
      pager.hidden =
        Number(pager.dataset.per) !== state.perPage || Number(pager.dataset.page) !== state.page;
    }
    selectValue(select!, state.perPage);
    if (announce && status && data.showing) {
      const { from, to } = visibleRange(state, total);
      status.textContent = data.showing
        .replace('{from}', String(from))
        .replace('{to}', String(to))
        .replace('{total}', String(total));
    }
  }

  function current(): PagerState {
    return readState(env.location.search, params, options, defaultPerPage, total);
  }

  function go(state: PagerState) {
    env.history?.pushState({}, '', stateUrl(env.location.pathname, state, defaultPerPage, params));
    apply(state, true);
  }

  /* Sin query manda lo recordado; se escribe en la URL sin sumar una entrada al historial. */
  let initial = current();
  const remembered = Number(safeGet(env.storage, key));
  if (!env.location.search.includes(`${params.perPage}=`) && options.includes(remembered)) {
    initial = { perPage: remembered, page: 1 };
    if (remembered !== defaultPerPage) {
      env.history?.replaceState(
        {},
        '',
        stateUrl(env.location.pathname, initial, defaultPerPage, params),
      );
    }
  }
  apply(initial, false);

  select.addEventListener('change', () => {
    const perPage = Number(select.value);
    safeSet(env.storage, key, String(perPage));
    go({ perPage, page: 1 });
  });

  /* Los enlaces del paginador a esta misma página (con query) cambian de página sin recargar; los
     de las rutas estáticas navegan de verdad. */
  root.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('[data-index-pagination] a[href]');
    if (!link) return;
    const target = new URL(link.getAttribute('href') ?? '', env.location.href);
    if (target.pathname !== env.location.pathname || !target.search) return;
    event.preventDefault();
    go(readState(target.search, params, options, defaultPerPage, total));
    root.focus();
  });

  env.browserWindow?.addEventListener('popstate', () => apply(current(), true));
}
