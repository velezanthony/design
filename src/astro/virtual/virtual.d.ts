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
    name: string;
    seo: {
      titleSuffix: Label | false;
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
      seo?: { title?: Label; titleSuffix?: Label | false; description?: Label; noindex?: boolean };
      translations?: 'link' | 'omit' | 'fallback';
    }[];
    sidebar?: SidebarItem[];
    nav?: NavItem[];
    footer?: FooterConfig;
    components?: { Footer?: string };
    editUrl?: string;
    repoRoot?: string;
    privacyUrl?: Label;
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
