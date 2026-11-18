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

/** La elección guardada si es legible y de versión igual o posterior (otro sitio que comparte la clave pudo subirla); todo lo demás es «aún sin elección». */
export function parseConsent(raw: string | null, version = CONSENT_VERSION): Consent | undefined {
  const stored = readStored(raw);
  return stored && stored.v >= version ? stored.choice : undefined;
}

export function readConsent(storage: Storage | undefined): Consent | undefined {
  return parseConsent(safeGet(storage, CONSENT_KEY));
}

/** `true` si quedó guardada; guarda `max(versión almacenada, propia)` para no hacer obsoleta la elección en un sitio con política más reciente. */
export function writeConsent(storage: Storage | undefined, choice: Consent): boolean {
  const stored = readStored(safeGet(storage, CONSENT_KEY));
  const version = Math.max(stored?.v ?? 0, CONSENT_VERSION);
  return safeSet(storage, CONSENT_KEY, serializeConsent(choice, version));
}

/** Cada dominio donde pudo ponerse una cookie de este host (él y sus padres, con y sin punto); se omite un TLD desnudo, que no admite cookies. */
export function domainsOf(hostname: string): string[] {
  const labels = hostname.split('.');
  const domains: string[] = [];
  for (let index = 0; index < labels.length - 1; index++) {
    const domain = labels.slice(index).join('.');
    domains.push(domain, `.${domain}`);
  }
  return domains;
}

function isAnalyticsCookie(name: string) {
  return /^_ga(_.+)?$/.test(name);
}

/** Cadenas de `document.cookie` que caducan las cookies de Google Analytics en el host y en cada dominio padre, porque no se sabe dónde se pusieron. */
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
function loadGtm(htmlDocument: Document, id: string): boolean {
  if (htmlDocument.getElementById(GTM_SCRIPT_ID)) return false;

  const browserWindow = htmlDocument.defaultView as unknown as { dataLayer?: unknown[] };
  browserWindow.dataLayer ??= [];
  browserWindow.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = htmlDocument.createElement('script');
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  htmlDocument.head.appendChild(script);
  return true;
}

export interface ConsentEnv {
  htmlDocument: Document;
  storage: Storage | undefined;
  hostname: string;
  reload: () => void;
}

/** Cablea el banner; GTM se carga aquí y solo si se acepta (sin `data-gtm-id` no hay nada), y un rechazo tras conceder borra cookies y recarga porque el contenedor no se descarga. */
export function initConsent({ htmlDocument, storage, hostname, reload }: ConsentEnv): void {
  const foundBanner = htmlDocument.querySelector<HTMLElement>('[data-consent-banner]');
  if (!foundBanner) return;
  /* Las declaraciones de abajo no heredan el descarte de `null`: se fija en una constante. */
  const banner = foundBanner;

  const gtmId = banner.dataset.gtmId;
  let loaded = false;

  /* El banner va fijo abajo; la página reserva sitio para que nunca tape el pie. */
  function show() {
    banner.removeAttribute('hidden');
    htmlDocument.documentElement.style.setProperty(
      '--consent-space',
      `${banner.offsetHeight ?? 0}px`,
    );
  }
  function hide() {
    banner.setAttribute('hidden', '');
    htmlDocument.documentElement.style.removeProperty('--consent-space');
  }

  function grant() {
    if (gtmId) loaded = loadGtm(htmlDocument, gtmId) || loaded;
  }

  function choose(choice: Consent) {
    writeConsent(storage, choice);
    hide();
    if (choice === 'granted') return grant();
    if (!loaded) return;
    for (const cookie of analyticsCookiesToDelete(htmlDocument.cookie, hostname))
      htmlDocument.cookie = cookie;
    reload();
  }

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => choose('granted'));
  banner.querySelector('[data-consent-reject]')?.addEventListener('click', () => choose('denied'));

  for (const opener of htmlDocument.querySelectorAll('[data-consent-open]')) {
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
