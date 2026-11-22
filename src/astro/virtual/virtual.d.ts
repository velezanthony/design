/* Tipos del módulo virtual (`injectTypes`), autocontenidos porque se copian al `.astro/` del consumidor; solo `astro/data` y `testing/` los importan. */
declare module 'virtual:@velezanthony/design/config' {
  type Label = string | Record<string, string>;
  type SidebarItem = string | { label: Label; slug?: string; items?: SidebarItem[] };
  type NavItem =
    | { label: Label; dir?: string; sidebar?: SidebarItem[] }
    | { label: Label; slug: string }
    | { label: Label; href: string; icon?: 'github' };
  type FooterLink = { label: Label; slug: string } | { label: Label; href: string };
  type FooterConfig = {
    license?: string | { label: Label; href: string };
    author?: { name: string; href: string } | false;
    links?: FooterLink[];
  };

  const config: {
    site: {
      name: string;
      favicon?: string;
      social?: { github?: string };
      components?: { Footer?: string };
      footer?: FooterConfig;
      layout: {
        sidebar: 'open' | 'collapsed';
        toc: 'open' | 'collapsed';
        width: 'reading' | 'full';
        toggles: boolean;
      };
      seo: {
        titleSuffix: Label | false;
        description?: Label;
        image?: { src: string; alt: Label };
        ogLocales?: Record<string, string>;
        sitemap: { include: string[] };
      };
      analytics: { gtmId?: string; privacyUrl?: Label };
    };
    i18n: {
      locales: string[];
      defaultLocale: string;
      missing: 'link' | 'omit' | 'fallback';
      missingDeclared: boolean;
    };
    content: {
      dir: string;
      external: {
        slug: string;
        file: string;
        locales?: string[];
        seo?: {
          title?: Label;
          titleSuffix?: Label | false;
          description?: Label;
          noindex?: boolean;
        };
        translations?: 'link' | 'omit' | 'fallback';
      }[];
      editUrl?: string;
      repoRoot?: string;
      nav?: NavItem[];
      sidebar?: SidebarItem[];
      /** Ajustes por carpeta tal como se declararon (la herencia la resuelve `folderSettings`). */
      folders: {
        declared: Record<
          string,
          {
            listing?: {
              generate?: boolean;
              view?: 'list' | 'table' | 'cards';
              pageSize?: number;
              perPageOptions?: number[];
              covers?: boolean;
            };
            tree?: { show?: 'section' | 'all'; depth?: number };
          }
        >;
      };
    };
    /** Textos de interfaz ya fusionados con los del consumidor, por idioma. */
    strings: Record<string, Record<string, string>>;
    base: string;
    /** El `site` de Astro (la URL del sitio). */
    siteUrl: string;
    trailingSlash: 'always' | 'never' | 'ignore';
    buildFormat: 'directory' | 'file' | 'preserve';
    publicDir: string;
    root: string;
  };
  export default config;
}

/* El pie de las páginas de docs: el `.astro` de `components.Footer` o el `DocsFooter` del paquete.
   Sus props son `FooterProps` (exportado por `@velezanthony/design/integration`). */
declare module 'virtual:@velezanthony/design/components/Footer' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- autocontenido: la firma de un componente Astro
  const Footer: (props: any) => any;
  export default Footer;
}
