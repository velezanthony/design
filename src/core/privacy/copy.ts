import type { Locale } from '../i18n/locale';

/** Quién responde de los datos: nombre y correo de contacto de la política. */
export interface Controller {
  name: string;
  email: string;
}

/** El responsable por defecto: el del portfolio, del que cuelgan las webs de documentación. */
export const DEFAULT_CONTROLLER: Readonly<Controller> = {
  name: 'Anthony Velez Tapia',
  email: 'velezanthony2000@gmail.com',
};

/** Idiomas con texto de privacidad. Añadir uno es añadir su función a `COPY` y su slug. */
export const PRIVACY_LOCALES = ['es', 'en'] as const;

/** Orden y anclas de las secciones; las dos lenguas las siguen al pie de la letra. */
export const PRIVACY_SECTION_IDS = [
  'controller',
  'scope',
  'data',
  'cookies',
  'retention',
  'rights',
] as const;

/**
 * Fecha de la última revisión del texto (ISO). Si cambia un hecho de la política (un tercero
 * nuevo, otra cookie, otro proveedor), cámbialo AQUÍ y sube la versión del consentimiento si lo
 * que el visitante aceptó ya no es lo mismo, para que se le vuelva a preguntar.
 */
export const PRIVACY_UPDATED = '2026-11-17';

/** Un bloque de la política ya en un idioma: lo único que conoce el componente. */
export type PrivacyBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; caption: string; head: string[]; rows: string[][] }
  | { kind: 'links'; items: { label: string; href: string }[] };

export interface PrivacySection {
  id: string;
  title: string;
  blocks: PrivacyBlock[];
}

const text = (value: string): PrivacyBlock => ({ kind: 'text', text: value });
const links = (...items: { label: string; href: string }[]): PrivacyBlock => ({
  kind: 'links',
  items,
});
const contact = ({ email }: Controller) => links({ label: email, href: `mailto:${email}` });

/** La política con las webs de documentación de los proyectos, en el mismo dominio, como alcance. */
const DOCS_SITES = 'velezanthony.github.io/<repo>/';

const es = (controller: Controller): PrivacySection[] => [
  {
    id: 'controller',
    title: 'Quién está detrás',
    blocks: [
      text(
        `Soy ${controller.name} y esta política cubre mi portfolio y las webs de documentación de mis proyectos. No te pido ningún dato ni hago nada con los tuyos. Aquí abajo te cuento para qué uso las cookies: solo para saber cuántas personas entran y qué páginas visitan, y únicamente si lo aceptas. Si tienes alguna duda, escríbeme.`,
      ),
      contact(controller),
    ],
  },
  {
    id: 'scope',
    title: 'A qué webs se aplica',
    blocks: [
      text(
        `Esta política vale para este sitio y también para las webs de documentación de los proyectos publicadas en ${DOCS_SITES}. Todas tienen el mismo responsable, la misma configuración de analítica (Google Tag Manager y Google Analytics 4) y el mismo consentimiento: lo que aceptes o rechaces en una vale para todas, porque comparten dominio y almacenamiento del navegador.`,
      ),
    ],
  },
  {
    id: 'data',
    title: 'Qué se recoge y por qué',
    blocks: [
      text(
        'Estas webs no tienen formularios, cuentas ni publicidad, y no vendo ni cedo datos. Esto es todo lo que pasa con los tuyos.',
      ),
      {
        kind: 'table',
        caption: 'Datos tratados, por origen',
        head: ['Origen', 'Qué se trata', 'Para qué y con qué base'],
        rows: [
          [
            'GitHub Pages',
            'Tu dirección IP, tu navegador y la página que pides, en los registros del servidor. GitHub aloja las webs y trata esos registros por su cuenta.',
            'Servir las webs y mantenerlas seguras. Interés legítimo (art. 6.1.f RGPD).',
          ],
          [
            'Google Tag Manager y Google Analytics 4',
            'Un identificador anónimo en una cookie, las páginas que ves, tu tipo de dispositivo y navegador y una ubicación aproximada. Solo si aceptas. Lo trata Google Ireland Limited.',
            'Saber qué se lee y mejorar las webs. Tu consentimiento (art. 6.1.a RGPD). Si los datos viajan a Estados Unidos, la transferencia se ampara en el Marco de Privacidad de Datos UE-EE. UU.',
          ],
          [
            'Recuentos de descargas (solo en el portfolio)',
            'Tu navegador pide el número de descargas a shields.io (PyPI), Open VSX (Eclipse Foundation) y Visual Studio Marketplace (Microsoft). Con la petición, esos servicios reciben tu IP. No usan cookies.',
            'Mostrar cuántas veces se ha descargado cada herramienta. Interés legítimo (art. 6.1.f RGPD). No hace falta consentimiento.',
          ],
          [
            'Tu navegador',
            'El tema, la disposición de la página (columnas y ancho), tu elección sobre las cookies y, solo en el portfolio, el idioma de la última página. Se guardan en localStorage (y sessionStorage) y nunca salen de tu navegador.',
            'Recordar tus preferencias. Ni yo ni nadie más los trata.',
          ],
        ],
      },
      text('Cada servicio tiene su propia política de privacidad:'),
      links(
        {
          label: 'GitHub',
          href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
        },
        { label: 'Google', href: 'https://policies.google.com/privacy' },
        { label: 'Eclipse Foundation', href: 'https://www.eclipse.org/legal/privacy/' },
        { label: 'Microsoft', href: 'https://privacy.microsoft.com/privacystatement' },
      ),
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    blocks: [
      text(
        'Solo uso cookies de analítica, y solo si las aceptas. Mientras no aceptes, ni siquiera se carga Google Tag Manager.',
      ),
      {
        kind: 'table',
        caption: 'Cookies de estas webs',
        head: ['Nombre', 'Proveedor', 'Para qué', 'Duración', 'Tipo'],
        rows: [
          [
            '_ga',
            'Google Ireland Limited',
            'Distingue a un visitante de otro',
            '2 años',
            'Analítica, de tercero',
          ],
          [
            '_ga_<ID>',
            'Google Ireland Limited',
            'Guarda el estado de la sesión de Google Analytics 4',
            '2 años',
            'Analítica, de tercero',
          ],
        ],
      },
      text(
        'El tema, la disposición de la página y tu elección viven en el almacenamiento del navegador (localStorage). No son cookies y no necesitan consentimiento.',
      ),
      text(
        'Puedes cambiar de opinión cuando quieras con «Preferencias de cookies», al pie de la página. Rechazar después de haber aceptado borra las cookies de Google Analytics y recarga la página. También puedes borrarlas desde los ajustes de tu navegador.',
      ),
    ],
  },
  {
    id: 'retention',
    title: 'Cuánto tiempo se conservan',
    blocks: [
      {
        kind: 'list',
        items: [
          'Cookies de Google Analytics: hasta 2 años desde la última visita, o hasta que las borres o retires tu consentimiento.',
          'Preferencias del navegador (tema, disposición, tu elección sobre las cookies): hasta que las borres desde tu navegador. Nunca salen de él.',
          'Registros de GitHub Pages: el plazo lo fija GitHub en su política de privacidad. Yo no tengo acceso a ellos.',
        ],
      },
    ],
  },
  {
    id: 'rights',
    title: 'Tus derechos',
    blocks: [
      text('Sobre tus datos puedes ejercer estos derechos:'),
      {
        kind: 'list',
        items: [
          'Acceso: saber qué datos tuyos se tratan.',
          'Rectificación: corregirlos si son inexactos.',
          'Supresión: pedir que se borren.',
          'Oposición: oponerte a un tratamiento.',
          'Limitación: pedir que se congelen.',
          'Portabilidad: recibirlos en un formato que puedas reutilizar.',
        ],
      },
      text(
        'Para ejercerlos, escríbeme. Si lo que buscas está en manos de GitHub, Google u otro servicio, también puedes pedírselo a ellos. Puedes retirar tu consentimiento cuando quieras, con «Preferencias de cookies» al pie de la página; lo tratado hasta entonces sigue siendo válido.',
      ),
      contact(controller),
      text(
        'Si crees que no he tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos.',
      ),
      links({ label: 'aepd.es', href: 'https://www.aepd.es' }),
    ],
  },
];

const en = (controller: Controller): PrivacySection[] => [
  {
    id: 'controller',
    title: 'Who runs this site',
    blocks: [
      text(
        `I’m ${controller.name}, and this policy covers my portfolio and the documentation sites of my projects. I don’t ask for any data and do nothing with yours. Below I explain what I use cookies for: only to know how many people visit and which pages they read, and only if you agree. If you have any question, write to me.`,
      ),
      contact(controller),
    ],
  },
  {
    id: 'scope',
    title: 'Which sites it applies to',
    blocks: [
      text(
        `This policy applies to this site and also to the documentation sites of the projects published at ${DOCS_SITES}. They all share the same controller, the same analytics setup (Google Tag Manager and Google Analytics 4) and the same consent: what you accept or reject on one holds for all of them, because they share a domain and the browser’s storage.`,
      ),
    ],
  },
  {
    id: 'data',
    title: 'What is collected and why',
    blocks: [
      text(
        'These sites have no forms, accounts or ads, and I do not sell or share data. This is everything that happens to yours.',
      ),
      {
        kind: 'table',
        caption: 'Data handled, by source',
        head: ['Source', 'What is handled', 'Why, and on what basis'],
        rows: [
          [
            'GitHub Pages',
            'Your IP address, your browser and the page you ask for, in the server logs. GitHub hosts the sites and handles those logs on its own account.',
            'Serving the sites and keeping them secure. Legitimate interest (GDPR art. 6.1.f).',
          ],
          [
            'Google Tag Manager and Google Analytics 4',
            'An anonymous identifier in a cookie, the pages you view, your device and browser type and an approximate location. Only if you accept. Google Ireland Limited handles it.',
            'Knowing what gets read and improving the sites. Your consent (GDPR art. 6.1.a). If the data travels to the United States, the transfer relies on the EU-US Data Privacy Framework.',
          ],
          [
            'Download counts (portfolio only)',
            'Your browser asks shields.io (PyPI), Open VSX (Eclipse Foundation) and the Visual Studio Marketplace (Microsoft) for the number of downloads. With the request, those services receive your IP. They set no cookies.',
            'Showing how many times each tool has been downloaded. Legitimate interest (GDPR art. 6.1.f). No consent needed.',
          ],
          [
            'Your browser',
            'The theme, the page layout (columns and width), your choice about cookies and, on the portfolio only, the language of the last page. They are kept in localStorage (and sessionStorage) and never leave your browser.',
            'Remembering your preferences. Neither I nor anyone else handles them.',
          ],
        ],
      },
      text('Each service has its own privacy policy:'),
      links(
        {
          label: 'GitHub',
          href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
        },
        { label: 'Google', href: 'https://policies.google.com/privacy' },
        { label: 'Eclipse Foundation', href: 'https://www.eclipse.org/legal/privacy/' },
        { label: 'Microsoft', href: 'https://privacy.microsoft.com/privacystatement' },
      ),
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    blocks: [
      text(
        'I only use analytics cookies, and only if you accept them. Until you do, Google Tag Manager is not even loaded.',
      ),
      {
        kind: 'table',
        caption: 'Cookies on these sites',
        head: ['Name', 'Provider', 'Purpose', 'Duration', 'Type'],
        rows: [
          [
            '_ga',
            'Google Ireland Limited',
            'Tells one visitor from another',
            '2 years',
            'Analytics, third party',
          ],
          [
            '_ga_<ID>',
            'Google Ireland Limited',
            'Keeps the state of the Google Analytics 4 session',
            '2 years',
            'Analytics, third party',
          ],
        ],
      },
      text(
        'The theme, the page layout and your choice live in the browser’s storage (localStorage). They are not cookies and need no consent.',
      ),
      text(
        'You can change your mind at any time with “Cookie preferences”, at the foot of the page. Rejecting after having accepted deletes the Google Analytics cookies and reloads the page. You can also delete them from your browser’s settings.',
      ),
    ],
  },
  {
    id: 'retention',
    title: 'How long it is kept',
    blocks: [
      {
        kind: 'list',
        items: [
          'Google Analytics cookies: up to 2 years from your last visit, or until you delete them or withdraw your consent.',
          'Browser preferences (theme, layout, your choice about cookies): until you delete them from your browser. They never leave it.',
          'GitHub Pages logs: GitHub sets the period in its privacy policy. I have no access to them.',
        ],
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    blocks: [
      text('Over your data you can exercise these rights:'),
      {
        kind: 'list',
        items: [
          'Access: knowing what data of yours is handled.',
          'Rectification: correcting it if it is wrong.',
          'Erasure: asking for it to be deleted.',
          'Objection: opposing a way of handling it.',
          'Restriction: asking for it to be frozen.',
          'Portability: receiving it in a format you can reuse.',
        ],
      },
      text(
        'To exercise them, write to me. If what you want is held by GitHub, Google or another service, you can ask them too. You can withdraw your consent whenever you like, with “Cookie preferences” at the foot of the page; what was handled until then remains valid.',
      ),
      contact(controller),
      text(
        'If you think I have not handled your data properly, you can complain to the Spanish Data Protection Agency (AEPD).',
      ),
      links({ label: 'aepd.es', href: 'https://www.aepd.es' }),
    ],
  },
];

const COPY: Readonly<
  Record<(typeof PRIVACY_LOCALES)[number], (c: Controller) => PrivacySection[]>
> = { es, en };

/** ¿Hay texto de privacidad en este idioma? */
export const hasPrivacyCopy = (locale: Locale): boolean => locale in COPY;

/** La política en un idioma y con el responsable dado. Lanza si no hay texto en ese idioma. */
export function privacyCopy(locale: Locale, controller: Controller): PrivacySection[] {
  if (!hasPrivacyCopy(locale)) {
    throw new Error(
      `No hay texto de privacidad en «${locale}» (disponibles: ${PRIVACY_LOCALES.join(', ')}).`,
    );
  }
  return COPY[locale as keyof typeof COPY](controller);
}
