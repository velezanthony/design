# Changelog

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Sin versiones todavía:
todo vive en «Sin publicar».

## Sin publicar

### Cambios que rompen

- **La librería ya no genera la 404 ni la página de privacidad.** Las pone el portfolio, una vez para
  todo el dominio. Se quitan las rutas `/404`, `/[locale]/404`, `/[privacy]` y `/[locale]/[privacy]`,
  `NotFoundLayout`, `PrivacyLayout`, `organisms/not-found` y `organisms/privacy` (`ConsentBanner` se
  queda, ahora en `organisms/chrome`) y `core/privacy`. Un `src/pages/404.astro` o
  `src/pages/privacidad.astro` del sitio ya no «sustituye» nada: es simplemente una página del sitio.
- **Se quitan `privacy.page` y `privacy.controller` de la config.** La config es estricta: dejarlas
  falla con «opción desconocida».
- **La analítica exige `privacyUrl`.** La librería ya no enlaza por defecto a la política del
  portfolio.

  | Config | Resultado |
  | --- | --- |
  | `gtmId` (o `PUBLIC_GTM_ID`) + `privacyUrl` | Analítica, banner de cookies y enlace en el pie |
  | Solo `privacyUrl` | Solo el enlace en el pie |
  | Solo `gtmId` | `astro build` falla nombrando `privacyUrl`; `astro dev` avisa y arranca sin analítica |
  | Ninguno | Nada |

  Si hoy usas `PUBLIC_GTM_ID` sin `privacyUrl`, añade esta última: `privacyUrl: 'https://…'` o una por
  idioma.
- **Se quitan los textos `notFound.*` y `privacy.eyebrow`, `privacy.updated` y `privacy.description`
  del catálogo de interfaz** (`consent.privacy` se queda). Una sobrescritura de esas claves en `ui`
  falla como clave desconocida.
- **El panel SEO on page deja de listar la 404 y la privacidad como archivos que genera la librería,**
  y `sitemap.xml` ya no suma las URLs de privacidad.
- **`BaseLayout` sustituye a `Shell`.** `components/layouts/Shell.astro` ya no existe; su sitio lo
  ocupa `components/layouts/BaseLayout.astro`, que pinta `<html>`, `<head>` (con `theme.css`, el tema y
  el consentimiento) y deja el `<body>` a quien lo usa: `bodyClass` por props (antes el `<body>` llevaba
  siempre `flex min-h-dvh flex-col`) y las ranuras `head`, la de por defecto y `scripts`. Ya no recibe
  `layout`, `pending` ni `htmlAttrs` de la 404 (sí un `htmlAttrs` genérico). El tema y el consentimiento
  los arranca ahora `bootBase`; `bootDocs` ya no los cablea.

### Añadido

- **`Icon` admite `mail` y `linkedin`** (la segunda rellena, como `github`).
- **`InlineList`, `Text` y `SectionHead`**, subidos desde el portfolio: `components/atoms/display/InlineList.astro`,
  `components/atoms/display/Text.astro` y `components/molecules/content/SectionHead.astro` (esta última sobre
  `Heading` y `Link`). Genéricas: sin datos ni textos propios. Ver «Piezas sueltas» en la documentación.
- **Subrutas nuevas en `exports`** para no duplicar piezas: `client/theme`, `client/consent`,
  `client/storage`, `client/toc`, `head` (`buildHead` y `HeadConfig`), `ui-strings` (`UiStrings`) y
  `code-themes`. Ninguna importa `seo-on-page`.
