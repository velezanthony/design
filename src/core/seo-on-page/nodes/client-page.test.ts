import { describe, expect, it } from 'vitest';
import type { ClientPage } from '../../seo/client-pages';
import type { HeadFacts } from '../../seo/html-head';
import { clientFacts } from './client-page';

const ctx = { locales: ['es', 'en'], defaultLocale: 'es', missing: 'link' as const, base: '/repo' };

const head = (extra: Partial<HeadFacts> = {}): HeadFacts => ({
  noindex: false,
  alternates: [],
  headings: [],
  og: {},
  jsonLd: [],
  ...extra,
});

const client = (path: string, extra: Partial<HeadFacts> = {}): ClientPage => ({
  path,
  pattern: '/cv',
  entrypoint: 'src/pages/cv.astro',
  head: head(extra),
});

describe('clientFacts: identidad', () => {
  it('su slug es la ruta sin la base, su fichero el .astro y su tipo «client»', () => {
    const [facts] = clientFacts([client('/repo/cv/', { lang: 'es' })], ctx);
    expect(facts).toMatchObject({
      slug: 'cv',
      locale: 'es',
      kind: 'client',
      sourcePath: 'src/pages/cv.astro',
    });
  });

  it('el idioma sale de <html lang>, también con región; si no es de la config, el por defecto', () => {
    const [us, unknown, none] = clientFacts(
      [
        client('/repo/a/', { lang: 'en-US' }),
        client('/repo/b/', { lang: 'fr' }),
        client('/repo/c/'),
      ],
      ctx,
    );
    expect([us!.locale, unknown!.locale, none!.locale]).toEqual(['en', 'es', 'es']);
  });

  it('las versiones de una página por idioma comparten slug: el de su versión en el idioma por defecto', () => {
    const alternates = [
      { hreflang: 'es', href: 'https://x.dev/repo/cv/' },
      { hreflang: 'en', href: 'https://x.dev/repo/en/resume/' },
    ];
    const pages = clientFacts(
      [
        client('/repo/cv/', { lang: 'es', alternates }),
        client('/repo/en/resume/', { lang: 'en', alternates }),
      ],
      ctx,
    );
    expect(pages.map(({ slug, locale }) => `${slug}:${locale}`)).toEqual(['cv:es', 'cv:en']);
  });

  it('la portada es el slug vacío, como en la documentación', () => {
    expect(clientFacts([client('/repo/', { lang: 'es' })], ctx)[0]!.slug).toBe('');
  });

  it('el título de la página es su primer H1; sin H1, el <title>', () => {
    const [withH1, withoutH1] = clientFacts(
      [
        client('/repo/a/', { title: 'A | Sitio', headings: [{ depth: 1, slug: 'a', text: 'A' }] }),
        client('/repo/b/', { title: 'B | Sitio' }),
      ],
      ctx,
    );
    expect([withH1!.title, withoutH1!.title]).toEqual(['A', 'B | Sitio']);
  });
});

describe('clientFacts: lo que publica', () => {
  it('título, descripción, Open Graph, canonical y noindex tal como salen en su <head>', () => {
    const [facts] = clientFacts(
      [
        client('/repo/cv/', {
          title: 'CV | Anthony',
          description: 'Mi CV',
          canonical: 'https://x.dev/repo/cv/',
          noindex: true,
          og: {
            title: 'CV',
            image: { src: 'https://x.dev/og.png', alt: 'Yo', width: 1200, height: 630 },
          },
        }),
      ],
      ctx,
    );
    expect(facts!.meta).toEqual({
      title: 'CV | Anthony',
      titleLength: 12,
      description: 'Mi CV',
      descriptionLength: 5,
      descriptionSource: 'page',
      ogTitle: 'CV',
      ogDescription: 'Mi CV',
      ogImage: { src: 'https://x.dev/og.png', alt: 'Yo', width: 1200, height: 630 },
      ogImageSource: 'page',
      canonical: '/repo/cv/',
      noindex: true,
    });
  });

  it('sin descripción, imagen ni canonical: lo dice, y el canonical es su propia ruta', () => {
    const [facts] = clientFacts([client('/repo/cv/', { title: 'CV' })], ctx);
    expect(facts!.meta).toMatchObject({
      descriptionSource: 'none',
      ogTitle: 'CV',
      ogImageSource: 'none',
      canonical: '/repo/cv/',
    });
    expect(facts!.meta.description).toBeUndefined();
  });

  it('sus encabezados y sus JSON-LD (una lista cuenta como varios), todos propios de la página', () => {
    const [facts] = clientFacts(
      [
        client('/repo/cv/', {
          headings: [{ depth: 1, slug: 'cv', text: 'CV' }],
          jsonLd: [{ '@type': 'Person' }, [{ '@type': 'WebSite' }, 'no es un objeto']],
        }),
      ],
      ctx,
    );
    expect(facts!.headings).toEqual([{ depth: 1, slug: 'cv', text: 'CV' }]);
    expect(facts!.schemas).toEqual([
      { schema: { '@type': 'Person' }, source: 'page' },
      { schema: { '@type': 'WebSite' }, source: 'page' },
    ]);
  });

  it('enlaces e imágenes no se recogen: el análisis que los necesita no la juzga', () => {
    const [facts] = clientFacts([client('/repo/cv/')], ctx);
    expect(facts!.links).toBeUndefined();
    expect(facts!.images).toBeUndefined();
  });
});

describe('clientFacts: idiomas', () => {
  it('presente en el suyo y en los que declara con hreflang; en el resto falta, con la política del sitio', () => {
    const [facts] = clientFacts(
      [
        client('/repo/cv/', {
          lang: 'es',
          alternates: [{ hreflang: 'x-default', href: 'https://x.dev/repo/cv/' }],
        }),
      ],
      ctx,
    );
    expect(facts!.locales).toEqual([
      { locale: 'es', status: 'present', url: '/repo/cv/' },
      { locale: 'en', status: 'missing', policy: 'link', declared: false },
    ]);
    expect(facts!.policy).toBe('link');
  });

  it('una versión declarada en otro idioma cuenta como presente, con su ruta', () => {
    const [facts] = clientFacts(
      [
        client('/repo/cv/', {
          lang: 'es',
          alternates: [{ hreflang: 'en', href: 'https://x.dev/repo/en/resume/' }],
        }),
      ],
      ctx,
    );
    expect(facts!.locales[1]).toEqual({ locale: 'en', status: 'present', url: '/repo/en/resume/' });
  });
});
