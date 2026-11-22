---
seo:
  title: "Idiomas, SEO y analítica de un sitio de docs"
  description: "Cómo publicar en varios idiomas, ajustar el SEO de cada página y el sitemap, revisarlo con el panel SEO y activar la analítica con consentimiento."
---

# Idiomas, SEO y analítica

Al terminar esta página tendrás el sitio en varios idiomas, el SEO de cada página ajustado y, si la
quieres, analítica con un aviso de cookies que no carga nada antes de aceptar.

## Idiomas

### El caso habitual

::::tabs
:::tab[docs.config.mjs]
```js
import { MissingTranslation } from '@velezanthony/design/integration';

i18n: { locales: ['es', 'en'], missing: MissingTranslation.LINK },
```
:::
:::tab[Archivos]
```text
src/content/docs/
├── index.md              → /
├── index.en.md           → /en/
└── tutoriales/
    ├── instalacion.md    → /tutoriales/instalacion/
    └── instalacion.en.md → /en/tutoriales/instalacion/
```
:::
::::

- El primer idioma (o `i18n.defaultLocale`) no lleva sufijo en el archivo ni prefijo en la URL.
- `x.en.md` es la traducción de `x.md`. Un sufijo que no está en `locales` rompe el build.
- Solo `es` y `en` traen textos de interfaz; otro idioma necesita añadirlos al paquete.

### Una URL traducida (`slug`)

```yaml
# tutoriales/instalacion.en.md
---
slug: tutorials/installation
---
```

La página inglesa sale en `/en/tutorials/installation/` y la española sigue en `/tutoriales/instalacion/`.

- Las traducciones se siguen emparejando por **nombre de archivo**, y la config (`sidebar`, `nav`,
  `footer`) las sigue nombrando por él.
- El `slug` es la ruta completa, sin idioma, `base` ni barras en los extremos. Lo usan el selector de
  idioma, `hreflang`, sitemap, barra lateral, listados y búsqueda.
- En un `_index.en.md`, mueve el listado de la carpeta (`/en/tutorials/page/2/`).

:::warning[Qué `slug` rompe el build]{collapsed}
Un `slug` mal formado (vacío, con barra final, con `..`, con prefijo de idioma o terminado en
`/index`), dos archivos con la misma URL en un idioma o un `slug` que choca con una ruta de la librería
o de tu `src/pages/`.
:::

### Cuando falta una traducción (`i18n.missing`)

| Política | Barra lateral del otro idioma | URL en el otro idioma |
| --- | --- | --- |
| `link` (por defecto) | Enlaza al original, con su insignia de idioma | No existe |
| `omit` | No aparece | No existe |
| `fallback` | Aparece normal | Muestra el original con un aviso, `noindex` y canonical al original |

- Una página cambia la política con `translations: omit` en su frontmatter. Todas las versiones de una
  página deben coincidir.
- Una traducción ausente sin política declarada solo avisa.

:::tip[Si vienes de MkDocs]{collapsed}
Su `fallback_to_default: true` es `fallback`, y `false` se parece a `omit`.
:::

### Textos de interfaz (`i18n.ui`)

```js
i18n: { ui: { es: { 'search.placeholder': 'Buscar en la guía' } } },
```

Se combinan clave a clave con los del paquete. Una clave mal escrita rompe el build con su ruta.

## SEO y sitemap

### La base del sitio y lo que cambia cada página

::::tabs
:::tab[docs.config.mjs]
```js
// docs.config.mjs
site: {
  seo: {
    titleSuffix: 'Mi proyecto', // texto, uno por idioma, o false; por defecto, site.name
    description: { es: 'Documentación de mi proyecto', en: 'My project docs' },
    image: { src: '/og.png', alt: 'Tarjeta del proyecto' }, // en public/ o https
    ogLocales: { es: 'es_ES', en: 'en_GB' }, // opcional: og:locale con territorio
  },
},
```
:::
:::tab[Frontmatter de una página]
```yaml
# frontmatter de una página: gana campo a campo
---
seo:
  title: Instalar en cualquier sistema # solo en el <head>; el h1 no cambia
  description: Cómo instalar el proyecto.
  image: { src: /og-instalar.png, alt: Captura del primer arranque }
---
```
:::
::::

- **El título** se forma `título | sufijo`. Cada parte se resuelve por separado: página > sitio >
  `site.name`. `titleSuffix: false` quita el sufijo; si título y sufijo coinciden, no se repite.
- **La imagen OG** debería medir unos 1,91:1 (1200×630) y pesar menos de 300 KB; si no, el build avisa.
  Sin `alt`, usa el título de la página.
- **`seo.noindex: true`** saca la página del sitemap y de la búsqueda.
- En un archivo `external`, el mismo bloque va en `content.external[].seo`.

### Datos estructurados (JSON-LD)

La librería no inyecta ninguno por su cuenta: tú los declaras y ella los valida y los pinta.

```js
site: { seo: { schema: [{ '@type': 'SoftwareSourceCode', name: 'Mi proyecto' }] } }, // todas las páginas
```

En una página, `seo.schema: [...]` se **suma** a los del sitio y `seo.schema: false` la deja sin
ninguno. Cada schema necesita `@type`; si falta `@context`, se añade `https://schema.org`. La config
viaja como JSON: calcula los objetos al construir y pásalos ya hechos.

### `sitemap.xml`

Se publica en `<base>/sitemap.xml`, con las alternativas `hreflang`. Entran las páginas reales e
indexables, también las de tu `src/pages/` (sácalas con `<meta name="robots" content="noindex">`).

- `<lastmod>` es la fecha del último commit del archivo. En CI, usa `fetch-depth: 0` en
  `actions/checkout`: un clon superficial no da fechas.
- **Varios sitios en un dominio:** el sitio de la raíz puede convertir su `sitemap.xml` en un índice de
  los demás con `site.seo.sitemap: { include: ['/proyecto-a/sitemap.xml'] }` (rutas del mismo origen).
- **Lo que no pone la librería:** `robots.txt`, la 404 (GitHub Pages sirve una sola por dominio) ni la
  etiqueta de verificación de Search Console. Envía el `sitemap.xml` a Search Console y verifica la
  propiedad por DNS o con Analytics.

### El panel SEO (solo en desarrollo)

Con `astro dev`, el sitio tiene tres páginas extra para revisar el SEO **mientras escribes**. Con
`astro build` no existen.

| Ruta | Qué enseña |
| --- | --- |
| `/seo-on-page/` | Resumen: páginas con errores, avisos o solo información, por gravedad y por tipo. |
| `/seo-on-page/pages/` | Una fila por página e idioma: `<title>` final y su longitud, origen de la descripción y problemas. Filtros en la URL, sin JavaScript. |
| `/seo-on-page/page/?slug=…&locale=…` | Inspector: vista previa en un buscador y al compartir, canonical, JSON-LD, encabezados y traducciones lado a lado. |

:::note[Qué revisa y cómo]{collapsed}
- Usa las mismas funciones que generan el `<head>`, así que lo que ves es lo que se publica. Tus
  páginas de `src/pages/` se leen como las ve un visitante.
- Límites orientativos: `<title>` de 15 a 60 caracteres, descripción de 70 a 160 y un solo H1. También
  avisa de duplicados, saltos de encabezado, traducciones ausentes, imágenes sin `alt`, enlaces a
  páginas `noindex` y páginas huérfanas.
- Cada problema dice **qué cambiar y en qué archivo** (`seo.description` en el frontmatter, o
  `external[].seo` en la config para un externo).
- Sin filtros, la tabla enseña errores y avisos; «Ocultar noindex» quita esas páginas de la vista.
:::

## Analítica y privacidad

### Activarla en dos pasos

1. Da el id del contenedor de Google Tag Manager, mejor en el entorno del build:

::::tabs
:::tab[Variable de entorno]
```sh
# .env (dev) o .env.production (build); añádelos a tu .gitignore.
PUBLIC_GTM_ID=GTM-XXXXXXX
```

En GitHub Actions, pásalo al paso de build (como _secret_ o variable; el id es público en la página
de todos modos):

```yaml
- run: npm run build
  env:
    PUBLIC_GTM_ID: ${{ secrets.PUBLIC_GTM_ID }}
```
:::
:::tab[En la config]
```js
site: { analytics: { gtmId: 'GTM-XXXXXXX' } },
```

Gana al entorno. Úsalo solo si un repo debe fijar siempre el mismo contenedor.
:::
::::

2. Declara tu política de privacidad, que la analítica exige:

   ```js
   site: { analytics: { privacyUrl: 'https://mi-dominio.dev/privacidad/' } },
   ```

Con eso, los visitantes ven el aviso de consentimiento, GTM se carga solo después de que acepten y el
pie recibe un botón «Preferencias de cookies» para cambiar de opinión. **Sin `PUBLIC_GTM_ID` no hay
nada:** ni script, ni aviso, ni botón, ni nada guardado en el navegador. Un build local o el de un fork
sale sin rastreo.

### Qué combinaciones valen

| `site.analytics` | Resultado |
| --- | --- |
| `gtmId` (o `PUBLIC_GTM_ID`) + `privacyUrl` | Analítica, aviso de cookies y enlace en el pie |
| Solo `privacyUrl` | Solo el enlace en el pie |
| Solo `gtmId` | `astro build` falla nombrando `privacyUrl`; `astro dev` avisa y arranca sin analítica |
| Ninguno | Nada |

:::note[Formato del id y de dónde se lee]{collapsed}
- El id debe ser `GTM-` más mayúsculas y dígitos; si no, el build falla (el mensaje nunca imprime el
  valor). Un valor en blanco cuenta como no definido.
- `dev` lee `.env.development` y `build` lee `.env.production`; las variables del entorno de la CI
  ganan a los archivos, y `site.analytics.gtmId` gana a todo.
:::

- `privacyUrl` admite una URL por idioma (`{ es: '…', en: '…' }`); un idioma sin entrada usa la del
  idioma por defecto.
- La librería no genera ninguna página de privacidad: la publica tu sitio, una vez para todo el dominio.

:::note[El consentimiento en el navegador]{collapsed}
- La elección se guarda en `localStorage` bajo `consent`, con una versión: si cambia lo que se pide,
  subir la versión vuelve a preguntar.
- Retirar el consentimiento es tan fácil como darlo: el botón del pie reabre el aviso. Un rechazo
  posterior borra las cookies de analítica del dominio y recarga la página.
- `consent` y `theme` viven en el origen (`usuario.github.io`), así que todos los sitios del dominio
  comparten la elección del visitante.
:::

En una página propia con `BaseLayout`, `@velezanthony/design/site` te da `gtmId` y `privacyUrl(locale)`
ya resueltos (ver [Páginas propias](./personalizar.md#páginas-propias)).

## Siguiente paso

Cambia el aspecto y añade tus propias páginas: [Personalizar](./personalizar.md).
