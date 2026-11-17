import { CONSENT_KEY, safeGet, safeSet } from './storage';

export type Consent = 'granted' | 'denied';

/** Súbela cuando la política cambie de un modo que exija una respuesta nueva: una elección
    guardada con una versión anterior cuenta como ninguna y se vuelve a preguntar a todos. */
export const CONSENT_VERSION = 1;

export function serializeConsent(choice: Consent, version = CONSENT_VERSION): string {
  return JSON.stringify({ v: version, choice });
}

/** La versión y la elección guardadas, si la cadena es legible. */
function readStored(raw: string | null): { v: number; choice: Consent } | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return undefined;
    const { v, choice } = value as { v?: unknown; choice?: unknown };
    if (typeof v !== 'number' || !Number.isInteger(v)) return undefined;
    if (choice !== 'granted' && choice !== 'denied') return undefined;
    return { v, choice };
  } catch {
    return undefined;
  }
}

/**
 * La elección guardada, si es legible y de una versión igual o posterior a la propia. Todo lo
 * demás (corrupto, de una versión anterior, editado a mano) es «aún sin elección»: se pregunta,
 * nunca se da por supuesto. Una versión mayor se acepta porque otro sitio que comparte la clave
 * (el portfolio) pudo subirla: quien ya respondió a una política más reciente no vuelve a ver
 * el banner.
 */
export function parseConsent(raw: string | null, version = CONSENT_VERSION): Consent | undefined {
  const stored = readStored(raw);
  return stored && stored.v >= version ? stored.choice : undefined;
}

export function readConsent(storage: Storage | undefined): Consent | undefined {
  return parseConsent(safeGet(storage, CONSENT_KEY));
}

/**
 * `true` si la elección quedó guardada. Guarda `max(versión almacenada, propia)`: bajar la
 * versión haría que un sitio con una política más reciente viera la elección como obsoleta y
 * volviera a preguntar.
 */
export function writeConsent(storage: Storage | undefined, choice: Consent): boolean {
  const stored = readStored(safeGet(storage, CONSENT_KEY));
  const version = Math.max(stored?.v ?? 0, CONSENT_VERSION);
  return safeSet(storage, CONSENT_KEY, serializeConsent(choice, version));
}

/**
 * Cada dominio en el que pudo ponerse una cookie de este host: el host y cada padre, con y sin
 * el punto inicial. Un dominio de primer nivel desnudo se omite: no admite cookies y el
 * navegador lo rechazaría.
 */
export function domainsOf(hostname: string): string[] {
  const labels = hostname.split('.');
  const domains: string[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join('.');
    domains.push(domain, `.${domain}`);
  }
  return domains;
}

const isAnalyticsCookie = (name: string) => /^_ga(_.+)?$/.test(name);

/**
 * Cadenas de `document.cookie` que caducan las cookies de Google Analytics (`_ga`,
 * `_ga_<contenedor>`). Una cookie solo se borra desde el dominio donde se puso y la página no
 * sabe cuál fue, así que cada una caduca en el host solo y en cada dominio padre.
 */
export function analyticsCookiesToDelete(cookieJar: string, hostname: string): string[] {
  const names = cookieJar
    .split(';')
    .map((pair) => pair.split('=')[0]!.trim())
    .filter(isAnalyticsCookie);
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

  return names.flatMap((name) => [
    `${name}=; ${expired}`,
    ...domainsOf(hostname).map((domain) => `${name}=; ${expired}; domain=${domain}`),
  ]);
}

const GTM_SCRIPT_ID = 'gtm-script';

/** Idempotente: el contenedor se carga una vez por muchas veces que se conceda el consentimiento. */
function loadGtm(doc: Document, id: string): boolean {
  if (doc.getElementById(GTM_SCRIPT_ID)) return false;

  const win = doc.defaultView as unknown as { dataLayer?: unknown[] };
  win.dataLayer ??= [];
  win.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = doc.createElement('script');
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  doc.head.appendChild(script);
  return true;
}

export interface ConsentEnv {
  doc: Document;
  storage: Storage | undefined;
  hostname: string;
  reload: () => void;
}

/**
 * Cablea el banner (`[data-consent-banner]`, con el contenedor en `data-gtm-id`). Google Tag
 * Manager se carga aquí y solo aquí, y solo para quien dijo que sí: no se pide nada a Google
 * antes. Sin `data-gtm-id` no se carga nada, se acepte o no.
 *
 * Revocar tiene que ser tan fácil como conceder, y tiene que ser real: con el contenedor en
 * marcha no se puede descargar, así que un rechazo tras una concesión borra las cookies y
 * recarga la página.
 */
export function initConsent({ doc, storage, hostname, reload }: ConsentEnv): void {
  const banner = doc.querySelector<HTMLElement>('[data-consent-banner]');
  if (!banner) return;

  const gtmId = banner.dataset.gtmId;
  let loaded = false;

  /* El banner va fijo abajo; la página reserva sitio para que nunca tape el pie. */
  const show = () => {
    banner.removeAttribute('hidden');
    doc.documentElement.style.setProperty('--consent-space', `${banner.offsetHeight ?? 0}px`);
  };
  const hide = () => {
    banner.setAttribute('hidden', '');
    doc.documentElement.style.removeProperty('--consent-space');
  };

  const grant = () => {
    if (gtmId) loaded = loadGtm(doc, gtmId) || loaded;
  };

  const choose = (choice: Consent) => {
    writeConsent(storage, choice);
    hide();
    if (choice === 'granted') return grant();
    if (!loaded) return;
    for (const cookie of analyticsCookiesToDelete(doc.cookie, hostname)) doc.cookie = cookie;
    reload();
  };

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => choose('granted'));
  banner.querySelector('[data-consent-reject]')?.addEventListener('click', () => choose('denied'));

  for (const opener of doc.querySelectorAll('[data-consent-open]')) {
    opener.addEventListener('click', () => {
      show();
      /* Quien usa teclado pulsó un control del pie: la elección es donde aterriza. */
      banner.querySelector<HTMLElement>('[data-consent-accept]')?.focus();
    });
  }

  const stored = readConsent(storage);
  if (stored === 'granted') grant();
  if (stored === undefined) show();
}
