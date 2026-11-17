import { describe, expect, it } from 'vitest';
import {
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  fitView,
  panBy,
  viewBoxSize,
  wheelFactor,
  zoomAt,
} from './diagram-view';

describe('clampScale', () => {
  it('deja pasar lo que está dentro del rango y recorta los extremos', () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(100)).toBe(MAX_SCALE);
  });

  it('un valor que no es un número válido vuelve a 1', () => {
    expect(clampScale(Number.NaN)).toBe(1);
  });
});

describe('viewBoxSize', () => {
  it('lee ancho y alto del viewBox', () => {
    expect(viewBoxSize('-50 -10 2000 1596')).toEqual({ width: 2000, height: 1596 });
    expect(viewBoxSize('0,0,300,200')).toEqual({ width: 300, height: 200 });
  });

  it('es undefined sin un viewBox utilizable', () => {
    expect(viewBoxSize(null)).toBeUndefined();
    expect(viewBoxSize('0 0 abc 10')).toBeUndefined();
    expect(viewBoxSize('0 0 0 10')).toBeUndefined();
  });
});

describe('fitView', () => {
  it('centra el contenido y lo escala para que quepa con su margen', () => {
    const view = fitView({ width: 1000, height: 500 }, { width: 600, height: 400 }, 50);
    expect(view.scale).toBeCloseTo(0.5);
    expect(view.x).toBeCloseTo(50);
    expect(view.y).toBeCloseTo(75);
  });

  it('limita al lado que antes se agota', () => {
    const view = fitView({ width: 100, height: 1000 }, { width: 1000, height: 500 }, 0);
    expect(view.scale).toBeCloseTo(0.5);
    expect(view.x).toBeCloseTo(475);
    expect(view.y).toBeCloseTo(0);
  });

  it('no sobrepasa los límites de zoom', () => {
    expect(fitView({ width: 10, height: 10 }, { width: 4000, height: 4000 }, 0).scale).toBe(
      MAX_SCALE,
    );
    expect(fitView({ width: 100000, height: 10 }, { width: 100, height: 100 }, 0).scale).toBe(
      MIN_SCALE,
    );
  });
});

describe('zoomAt', () => {
  it('el punto bajo el cursor no se mueve', () => {
    const before = { scale: 1, x: 20, y: 30 };
    const point = { x: 200, y: 150 };
    const after = zoomAt(before, 2, point);
    expect(after.scale).toBe(2);
    /* Coordenada del contenido bajo el punto: (punto - traslación) / escala. */
    expect((point.x - after.x) / after.scale).toBeCloseTo((point.x - before.x) / before.scale);
    expect((point.y - after.y) / after.scale).toBeCloseTo((point.y - before.y) / before.scale);
  });

  it('respeta los límites sin desplazar el contenido cuando ya está en el tope', () => {
    const atMax = { scale: MAX_SCALE, x: 5, y: 7 };
    expect(zoomAt(atMax, 2, { x: 100, y: 100 })).toEqual(atMax);
    const atMin = { scale: MIN_SCALE, x: 5, y: 7 };
    expect(zoomAt(atMin, 0.5, { x: 100, y: 100 })).toEqual(atMin);
  });

  it('un factor que se pasa del tope se recorta al tope', () => {
    expect(zoomAt({ scale: 6, x: 0, y: 0 }, 3, { x: 0, y: 0 }).scale).toBe(MAX_SCALE);
  });
});

describe('panBy', () => {
  it('desplaza sin tocar la escala', () => {
    expect(panBy({ scale: 2, x: 10, y: 10 }, -4, 6)).toEqual({ scale: 2, x: 6, y: 16 });
  });
});

describe('wheelFactor', () => {
  it('rueda hacia arriba acerca y hacia abajo aleja, de forma simétrica', () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(-100) * wheelFactor(100)).toBeCloseTo(1);
  });

  it('una ruedecilla por líneas pesa más que un desplazamiento en píxeles', () => {
    expect(wheelFactor(-3, 1)).toBeGreaterThan(wheelFactor(-3, 0));
  });

  it('el pellizco del trackpad (ctrl) es más sensible', () => {
    expect(wheelFactor(-5, 0, true)).toBeGreaterThan(wheelFactor(-5, 0, false));
  });

  it('un salto enorme no catapulta el zoom', () => {
    expect(wheelFactor(-100000)).toBeCloseTo(wheelFactor(-100));
  });
});
