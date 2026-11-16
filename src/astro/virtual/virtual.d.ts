/* Tipos del módulo virtual que sirve la integración (`injectTypes`). Es la config validada, ya con
   los valores por defecto, más lo de Astro (`base`, `site`, `trailingSlash`, `buildFormat`) y el
   catálogo de textos fusionado por idioma. Autocontenido: se copia al `.astro/` del consumidor,
   donde no se puede importar nada del paquete. Solo `astro/routes` y `testing/` lo importan. */
declare module 'virtual:@velezanthony/design/config' {
  type Label = string | Record<string, string>;
  type SidebarItem = string | { label: Label; slug?: string; items?: SidebarItem[] };
  type NavItem =
    | { label: Label; dir: string; sidebar?: SidebarItem[] }
    | { label: Label; slug: string }
    | { label: Label; href: string; icon?: 'github' };
  type FooterLink = { label: Label; slug: string } | { label: Label; href: string };
  type FooterConfig = {
    license?: string | { label: Label; href: string };
    author?: { name: string; href: string } | false;
    links?: FooterLink[];
  };

  const config: {
    name: string;
    seo: {
      titleTemplate: string;
      description?: Label;
      image?: { src: string; alt: Label };
    };
    favicon?: string;
    locales: string[];
    defaultLocale: string;
    translations: { missing: 'link' | 'omit' | 'fallback' };
    external: {
      slug: string;
      file: string;
      locales?: string[];
      seo?: { title?: string; description?: Label; noindex?: boolean };
      translations?: 'link' | 'omit' | 'fallback';
    }[];
    sidebar?: SidebarItem[];
    nav?: NavItem[];
    footer?: FooterConfig;
    editUrl?: string;
    repoRoot?: string;
    privacyUrl?: string;
    gtmId?: string;
    social?: { github?: string };
    layout: {
      sidebar: 'open' | 'collapsed';
      toc: 'open' | 'collapsed';
      width: 'reading' | 'full';
      toggles: boolean;
    };
    /** Textos de interfaz ya fusionados con los del consumidor, por idioma. */
    strings: Record<string, Record<string, string>>;
    base: string;
    site: string;
    trailingSlash: 'always' | 'never' | 'ignore';
    buildFormat: 'directory' | 'file' | 'preserve';
    publicDir?: string;
  };
  export default config;
}
