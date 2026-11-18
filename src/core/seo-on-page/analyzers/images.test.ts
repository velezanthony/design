import { describe, expect, it } from 'vitest';
import { THRESHOLDS } from '../thresholds';
import type { MetaNode, PageImage } from '../tree/types';
import { analyzeAltText, analyzeOgImage } from './images';

const page = { slug: 'guide', locale: 'en', kind: 'native' as const, sourcePath: 'docs/guide.md' };

describe('analyzeAltText', () => {
  it('todas con alt: sin problemas', () => {
    expect(analyzeAltText(page, [{ src: 'a.png', alt: 'captura' }])).toEqual([]);
  });

  it('sin imágenes o sin dato recogido: nada que juzgar', () => {
    expect(analyzeAltText(page, [])).toEqual([]);
    expect(analyzeAltText(page, undefined)).toEqual([]);
  });

  it('una sola incidencia por página, con el recuento de las que no tienen alt', () => {
    const images: PageImage[] = [
      { src: 'a.png', alt: '' },
      { src: 'b.png', alt: 'ok' },
      { src: 'c.png', alt: '' },
    ];
    const issues = analyzeAltText(page, images);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: 'image-alt-missing', severity: 'warning', value: 2 });
  });

  it('el mensaje y el arreglo nombran las imágenes y el archivo', () => {
    const [issue] = analyzeAltText(page, [{ src: 'img/a.png', alt: '' }]);
    expect(issue!.message).toMatch(/^Una imagen sin texto alternativo: «img\/a\.png»/);
    expect(issue!.fix).toContain('docs/guide.md');
    expect(issue!.fix).toContain('img/a.png');
  });

  it('con muchas, el mensaje enseña unas pocas y dice cuántas más', () => {
    const images = ['a', 'b', 'c', 'd', 'e'].map((name) => ({ src: `${name}.png`, alt: '' }));
    const [issue] = analyzeAltText(page, images);
    expect(issue!.message).toContain('a.png');
    expect(issue!.message).not.toContain('e.png');
    expect(issue!.message).toContain('2 más');
  });
});

const og = (
  width?: number,
  height?: number,
  source: MetaNode['ogImageSource'] = 'page',
): Pick<MetaNode, 'ogImage' | 'ogImageSource'> => ({
  ogImage: {
    src: '/og.png',
    alt: 'x',
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
  },
  ogImageSource: source,
});

describe('analyzeOgImage', () => {
  it('1200×630: sin problemas', () => {
    expect(analyzeOgImage(page, og(THRESHOLDS.ogWidth, THRESHOLDS.ogHeight))).toEqual([]);
  });

  it('más grande con la misma proporción: sin problemas', () => {
    expect(analyzeOgImage(page, og(2400, 1260))).toEqual([]);
  });

  it('sin imagen o sin dimensiones conocidas (una URL https): no se juzga', () => {
    expect(analyzeOgImage(page, { ogImageSource: 'none' })).toEqual([]);
    expect(analyzeOgImage(page, og())).toEqual([]);
  });

  it('con el ancho pero sin el alto tampoco se juzga: no hay proporción', () => {
    expect(analyzeOgImage(page, og(600))).toEqual([]);
  });

  it('el valor es el ancho y el mensaje dice que se recorta', () => {
    const [issue] = analyzeOgImage(page, og(1200, 800));
    expect(issue).toMatchObject({ value: 1200, severity: 'warning' });
    expect(issue!.message).toContain('las redes la recortan');
  });

  it('proporción distinta (cuadrada): aviso, porque las redes la recortan', () => {
    const [issue] = analyzeOgImage(page, og(1200, 1200));
    expect(issue).toMatchObject({
      kind: 'og-image-size',
      severity: 'warning',
      value: 1200,
      limit: THRESHOLDS.ogWidth,
    });
    expect(issue!.message).toContain('1200×1200');
  });

  it('proporción correcta pero pequeña (600×315): solo informativo', () => {
    expect(analyzeOgImage(page, og(600, 315))).toMatchObject([
      { kind: 'og-image-size', severity: 'info' },
    ]);
  });

  it('la proporción admite una pequeña tolerancia', () => {
    expect(analyzeOgImage(page, og(1200, 640))).toEqual([]);
  });

  it('dónde se arregla depende de quién declara la imagen', () => {
    const [own] = analyzeOgImage(page, og(100, 100, 'page'));
    const [site] = analyzeOgImage(page, og(100, 100, 'site'));
    expect(own!.fix).toContain('frontmatter');
    expect(site!.fix).toContain('docs.config.mjs');
  });
});
