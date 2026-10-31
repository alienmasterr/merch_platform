import { describe, expect, it } from 'vitest';
import {
  areaRect,
  calculatePosition,
  clampToArea,
  estimatePrintCost,
  fitToArea,
  isWithinArea,
  MIN_SCALE,
  PLACEMENT_LIMITS,
  viewOf,
} from './placement';

const chest = PLACEMENT_LIMITS.CHEST;
const sleeve = PLACEMENT_LIMITS.SLEEVE;
const base = { widthMm: 100, heightMm: 100, scale: 1, offsetX: 0, offsetY: 0 };

describe('clampToArea', () => {
  it('leaves a print that already fits untouched', () => {
    expect(clampToArea({ ...base, offsetX: 20, offsetY: -30 }, chest)).toEqual({
      ...base,
      offsetX: 20,
      offsetY: -30,
    });
  });

  it('pulls an offset back to the area edge', () => {
    const result = clampToArea({ ...base, offsetX: 500, offsetY: -500 }, chest);
    expect(result.offsetX).toBeCloseTo(99.9, 5);
    expect(result.offsetY).toBeCloseTo(-149.9, 5);
    expect(isWithinArea(result, chest)).toBe(true);
  });

  it('shrinks a print that is larger than the area and centers it', () => {
    const result = clampToArea({ ...base, scale: 2, offsetX: 30 }, sleeve);
    expect(result.scale).toBe(1);
    expect(result.offsetX).toBe(0);
    expect(isWithinArea(result, sleeve)).toBe(true);
  });

  it('keeps the scale above the minimum', () => {
    expect(clampToArea({ ...base, scale: 0.01 }, chest).scale).toBe(MIN_SCALE);
  });

  it('respects the narrow side of a non-square print', () => {
    const wide = { ...base, widthMm: 400, heightMm: 100 };
    const result = clampToArea(wide, chest);
    expect(result.scale).toBe(0.75);
    expect(isWithinArea(result, chest)).toBe(true);
  });

  it('never produces -0', () => {
    expect(Object.is(clampToArea({ ...base, offsetX: -0.01 }, chest).offsetX, -0)).toBe(false);
  });
});

describe('isWithinArea', () => {
  it('detects a print that crosses the edge', () => {
    expect(isWithinArea({ ...base, offsetX: 101 }, chest)).toBe(false);
    expect(isWithinArea({ ...base, offsetX: 100 }, chest)).toBe(true);
  });
});

describe('calculatePosition / areaRect', () => {
  it('centers the print on the area anchor', () => {
    expect(calculatePosition(base, 'CHEST')).toEqual({ x: 250, y: 250, width: 100, height: 100 });
  });

  it('applies scale and offsets', () => {
    expect(calculatePosition({ ...base, scale: 0.5, offsetX: 10, offsetY: -20 }, 'CHEST')).toEqual({
      x: 285,
      y: 255,
      width: 50,
      height: 50,
    });
  });

  it('describes the area rectangle around the anchor', () => {
    expect(areaRect('CHEST')).toEqual({ x: 150, y: 100, width: 300, height: 400 });
  });
});

describe('fitToArea', () => {
  it('keeps the aspect ratio of a wide image', () => {
    expect(fitToArea(2, chest)).toEqual({ widthMm: 180, heightMm: 90 });
  });

  it('limits a tall image by height', () => {
    expect(fitToArea(0.25, chest)).toEqual({ widthMm: 60, heightMm: 240 });
  });

  it('treats a broken aspect as square', () => {
    expect(fitToArea(Number.NaN, sleeve)).toEqual({ widthMm: 60, heightMm: 60 });
  });
});

describe('estimatePrintCost', () => {
  it('multiplies area by the technology rate', () => {
    expect(estimatePrintCost({ ...base, widthMm: 200, heightMm: 200 }, 'DTG')).toBe(100);
  });

  it('applies the minimum price for tiny prints', () => {
    expect(estimatePrintCost({ ...base, widthMm: 10, heightMm: 10 }, 'DTF')).toBe(15);
  });
});

describe('viewOf', () => {
  it('shows BACK on the back view and everything else on the front', () => {
    expect(viewOf('BACK')).toBe('back');
    expect(viewOf('SLEEVE')).toBe('front');
  });
});
