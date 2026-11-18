import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import {
  CONSENT_VERSION,
  analyticsCookiesToDelete,
  domainsOf,
  initConsent,
  parseConsent,
  readConsent,
  serializeConsent,
  writeConsent,
} from './consent';

const blocked = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
} as unknown as Storage;

function memory(initial: Record<string, string> = {}): Storage {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  } as Storage;
}

describe('parseConsent', () => {
  it.each(['granted', 'denied'] as const)('lee un %s guardado', (choice) => {
    expect(parseConsent(serializeConsent(choice))).toBe(choice);
  });

  /* Lo ilegible es «aún sin elección»: se pregunta de nuevo, nunca se da por supuesto. */
  it.each([
    null,
    '',
    'granted',
    '{',
    'null',
    '[]',
    '{"v":1}',
    '{"v":1,"choice":"maybe"}',
    '{"choice":"granted"}',
    '{"v":"1","choice":"granted"}',
    '{"v":1.5,"choice":"granted"}',
  ])('no es elección para %j', (raw) => {
    expect(parseConsent(raw)).toBeUndefined();
  });

  /* Un cambio de política sube la versión y así se vuelve a preguntar a todos. */
  it('no es elección si la versión guardada es anterior a la propia', () => {
    const old = serializeConsent('granted', CONSENT_VERSION - 1);
    expect(parseConsent(old)).toBeUndefined();
  });

  /* Contrato compartido con el portfolio: otro sitio puede haber subido la versión. Aceptarla
     evita preguntar dos veces a quien ya respondió a una política más reciente. */
  it('acepta una versión guardada mayor o igual que la propia', () => {
    expect(parseConsent(serializeConsent('denied', CONSENT_VERSION))).toBe('denied');
    expect(parseConsent(serializeConsent('granted', CONSENT_VERSION + 1))).toBe('granted');
    expect(parseConsent(serializeConsent('granted', CONSENT_VERSION + 7))).toBe('granted');
  });

  it('puede compararse con una versión propia distinta', () => {
    expect(parseConsent(serializeConsent('granted', 2), 3)).toBeUndefined();
    expect(parseConsent(serializeConsent('granted', 3), 3)).toBe('granted');
  });
});

describe('serializeConsent', () => {
  it('mantiene la forma del portfolio', () => {
    expect(JSON.parse(serializeConsent('granted'))).toEqual({
      v: CONSENT_VERSION,
      choice: 'granted',
    });
  });
});

describe('readConsent / writeConsent', () => {
  it('ida y vuelta por el almacenamiento', () => {
    const storage = memory();
    expect(writeConsent(storage, 'denied')).toBe(true);
    expect(readConsent(storage)).toBe('denied');
  });

  it('sin elección con el almacenamiento vacío, bloqueado o ausente', () => {
    expect(readConsent(memory())).toBeUndefined();
    expect(readConsent(blocked)).toBeUndefined();
    expect(readConsent(undefined)).toBeUndefined();
  });

  it('avisa de una escritura que no llegó', () => {
    expect(writeConsent(blocked, 'granted')).toBe(false);
  });

  /* Guardar baja la versión si no se hace con cuidado: el portfolio, en v2, vería la elección
     como obsoleta y preguntaría otra vez. Se guarda el máximo. */
  it('guarda el máximo entre la versión almacenada y la propia', () => {
    const storage = memory({ consent: serializeConsent('granted', CONSENT_VERSION + 2) });
    writeConsent(storage, 'denied');
    expect(JSON.parse(storage.getItem('consent')!)).toEqual({
      v: CONSENT_VERSION + 2,
      choice: 'denied',
    });
  });

  it('sube a la versión propia si la almacenada era menor', () => {
    const storage = memory({ consent: serializeConsent('granted', CONSENT_VERSION - 1) });
    writeConsent(storage, 'granted');
    expect(JSON.parse(storage.getItem('consent')!).v).toBe(CONSENT_VERSION);
  });

  it.each(['{', 'null', '{"v":"x"}', '{"v":1.5}'])(
    'ignora una versión ilegible (%j) al guardar',
    (raw) => {
      const storage = memory({ consent: raw });
      writeConsent(storage, 'granted');
      expect(JSON.parse(storage.getItem('consent')!).v).toBe(CONSENT_VERSION);
    },
  );
});

describe('domainsOf', () => {
  it('lista el host y cada padre donde pudo ponerse una cookie', () => {
    expect(domainsOf('velezanthony.github.io')).toEqual([
      'velezanthony.github.io',
      '.velezanthony.github.io',
      'github.io',
      '.github.io',
    ]);
  });

  it('nunca nombra un dominio de primer nivel desnudo', () => {
    expect(domainsOf('localhost')).toEqual([]);
    expect(domainsOf('example.com')).toEqual(['example.com', '.example.com']);
  });
});

describe('analyticsCookiesToDelete', () => {
  it('encuentra _ga y _ga_<contenedor>, y nada más', () => {
    const jar = 'theme=dark; _ga=GA1.1.1; _ga_ABC123=GS2.1; _gat=1; other_ga=2; _gid=3';
    const names = analyticsCookiesToDelete(jar, 'example.com').map((c) => c.split('=')[0]);
    expect([...new Set(names)]).toEqual(['_ga', '_ga_ABC123']);
  });

  it('caduca cada una en el host actual y en cada dominio padre', () => {
    const cookies = analyticsCookiesToDelete('_ga=1', 'example.com');
    expect(cookies).toHaveLength(3);
    for (const cookie of cookies) {
      expect(cookie).toContain('expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(cookie).toContain('path=/');
    }
    expect(cookies.some((c) => !c.includes('domain='))).toBe(true);
    expect(cookies.some((c) => c.includes('domain=.example.com'))).toBe(true);
  });

  it('es vacío si el tarro no tiene ninguna', () => {
    expect(analyticsCookiesToDelete('', 'example.com')).toEqual([]);
    expect(analyticsCookiesToDelete('theme=dark', 'example.com')).toEqual([]);
  });
});

describe('initConsent', () => {
  function markup(gtm: string) {
    return `
    <section data-consent-banner ${gtm} hidden>
      <button data-consent-accept>Accept</button>
      <button data-consent-reject>Reject</button>
    </section>
    <button data-consent-open>Preferences</button>`;
  }

  function setup(storage: Storage | undefined, cookie = '', gtm = 'data-gtm-id="GTM-TEST"') {
    const { document } = parseHTML(
      `<!doctype html><html><head></head><body>${markup(gtm)}</body></html>`,
    );
    let jar = cookie;
    const written: string[] = [];
    Object.defineProperty(document, 'cookie', {
      get: () => jar,
      set: (value: string) => {
        written.push(value);
        jar = value;
      },
    });
    const reload = vi.fn();
    initConsent({ doc: document, storage, hostname: 'example.com', reload });
    const banner = document.querySelector('[data-consent-banner]')!;
    function click(selector: string) {
      return document
        .querySelector(selector)!
        .dispatchEvent(new document.defaultView!.Event('click'));
    }
    function gtmScripts() {
      return document.querySelectorAll('script[src*="googletagmanager.com"]');
    }
    return { document, banner, click, gtmScripts, reload, written };
  }

  it('pregunta si no hay elección y no carga nada', () => {
    const { banner, gtmScripts } = setup(memory());
    expect(banner.hasAttribute('hidden')).toBe(false);
    expect(gtmScripts()).toHaveLength(0);
  });

  it('pregunta si el almacenamiento está bloqueado', () => {
    expect(setup(blocked).banner.hasAttribute('hidden')).toBe(false);
  });

  it('pregunta si la elección guardada es corrupta o antigua', () => {
    expect(setup(memory({ consent: '{' })).banner.hasAttribute('hidden')).toBe(false);
    const old = serializeConsent('granted', CONSENT_VERSION - 1);
    expect(setup(memory({ consent: old })).banner.hasAttribute('hidden')).toBe(false);
  });

  it('sigue oculto y carga GTM con un consentimiento guardado', () => {
    const { banner, gtmScripts } = setup(memory({ consent: serializeConsent('granted') }));
    expect(banner.hasAttribute('hidden')).toBe(true);
    expect(gtmScripts()[0]?.getAttribute('src')).toBe(
      'https://www.googletagmanager.com/gtm.js?id=GTM-TEST',
    );
  });

  it('respeta un consentimiento guardado con una versión mayor', () => {
    const stored = serializeConsent('granted', CONSENT_VERSION + 1);
    const { banner, gtmScripts } = setup(memory({ consent: stored }));
    expect(banner.hasAttribute('hidden')).toBe(true);
    expect(gtmScripts()).toHaveLength(1);
  });

  it('sigue oculto y no carga nada con un rechazo guardado', () => {
    const { banner, gtmScripts } = setup(memory({ consent: serializeConsent('denied') }));
    expect(banner.hasAttribute('hidden')).toBe(true);
    expect(gtmScripts()).toHaveLength(0);
  });

  it('aceptar guarda la elección, oculta el banner y carga GTM', () => {
    const storage = memory();
    const { banner, click, gtmScripts, reload } = setup(storage);
    click('[data-consent-accept]');
    expect(readConsent(storage)).toBe('granted');
    expect(banner.hasAttribute('hidden')).toBe(true);
    expect(gtmScripts()).toHaveLength(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('aceptar dos veces carga GTM una sola vez', () => {
    const { click, gtmScripts } = setup(memory());
    click('[data-consent-accept]');
    click('[data-consent-accept]');
    expect(gtmScripts()).toHaveLength(1);
  });

  it('rechazar desde el principio guarda el rechazo y no recarga', () => {
    const storage = memory();
    const { banner, click, gtmScripts, reload, written } = setup(storage, '_ga=1');
    click('[data-consent-reject]');
    expect(readConsent(storage)).toBe('denied');
    expect(banner.hasAttribute('hidden')).toBe(true);
    expect(gtmScripts()).toHaveLength(0);
    expect(reload).not.toHaveBeenCalled();
    expect(written).toEqual([]);
  });

  /* GTM ya corre en esta página y la única forma de apagarlo es salir de ella. */
  it('revocar tras aceptar borra las cookies de GA y recarga', () => {
    const storage = memory({ consent: serializeConsent('granted') });
    const { click, reload, written } = setup(storage, '_ga=1; _ga_X=2');
    click('[data-consent-reject]');
    expect(readConsent(storage)).toBe('denied');
    expect(written.length).toBeGreaterThan(0);
    expect(written.every((c) => c.includes('1970'))).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('revocar conserva una versión mayor ya guardada', () => {
    const storage = memory({ consent: serializeConsent('granted', CONSENT_VERSION + 1) });
    const { click } = setup(storage, '_ga=1');
    click('[data-consent-reject]');
    expect(JSON.parse(storage.getItem('consent')!).v).toBe(CONSENT_VERSION + 1);
  });

  /* Sin identificador no hay nada que cargar, ni al aceptar ni con un consentimiento guardado. */
  it('sin gtmId no carga nada, aceptado o no', () => {
    const fresh = setup(memory(), '', '');
    fresh.click('[data-consent-accept]');
    expect(fresh.gtmScripts()).toHaveLength(0);
    expect(fresh.document.querySelector('#gtm-script')).toBeNull();

    const stored = setup(memory({ consent: serializeConsent('granted') }), '', 'data-gtm-id=""');
    expect(stored.gtmScripts()).toHaveLength(0);
  });

  it('el control de preferencias reabre el banner y enfoca una opción', () => {
    const { banner, click, document } = setup(memory({ consent: serializeConsent('denied') }));
    const accept = document.querySelector<HTMLElement>('[data-consent-accept]')!;
    accept.focus = vi.fn();
    click('[data-consent-open]');
    expect(banner.hasAttribute('hidden')).toBe(false);
    expect(accept.focus).toHaveBeenCalled();
  });

  it('no hace nada en una página sin banner', () => {
    const { document } = parseHTML('<!doctype html><html><body></body></html>');
    expect(() =>
      initConsent({ doc: document, storage: memory(), hostname: 'x.com', reload: vi.fn() }),
    ).not.toThrow();
  });
});
