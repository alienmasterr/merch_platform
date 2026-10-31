import type { PrintPlacement, PrintTechnology } from '@merch/contracts';

export interface PlacementLimit {
  maxWidthMm: number;
  maxHeightMm: number;
}

export const PLACEMENT_LIMITS: Record<PrintPlacement, PlacementLimit> = {
  CHEST: { maxWidthMm: 300, maxHeightMm: 400 },
  BACK: { maxWidthMm: 350, maxHeightMm: 450 },
  SLEEVE: { maxWidthMm: 100, maxHeightMm: 100 },
  LEFT_LEG: { maxWidthMm: 150, maxHeightMm: 300 },
  RIGHT_LEG: { maxWidthMm: 150, maxHeightMm: 300 },
  ACCESSORY_FRONT: { maxWidthMm: 200, maxHeightMm: 200 },
};

export const PLACEMENT_ANCHORS: Record<PrintPlacement, { x: number; y: number }> = {
  CHEST: { x: 300, y: 300 },
  BACK: { x: 300, y: 330 },
  SLEEVE: { x: 90, y: 185 },
  LEFT_LEG: { x: 215, y: 450 },
  RIGHT_LEG: { x: 385, y: 450 },
  ACCESSORY_FRONT: { x: 300, y: 375 },
};

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 3;

export interface PrintGeometry {
  widthMm: number;
  heightMm: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const truncate01 = (value: number) => Math.trunc(value * 10) / 10;
const round1 = (value: number) => Math.round(value * 10) / 10;

export function clampToArea(print: PrintGeometry, limit: PlacementLimit): PrintGeometry {
  const fitScale = Math.min(limit.maxWidthMm / print.widthMm, limit.maxHeightMm / print.heightMm);
  const maxScale = Math.floor(Math.min(MAX_SCALE, fitScale) * 1000) / 1000;
  const scale = clamp(print.scale, Math.min(MIN_SCALE, maxScale), maxScale);

  const maxOffsetX = Math.max(0, (limit.maxWidthMm - print.widthMm * scale) / 2 - 1e-6);
  const maxOffsetY = Math.max(0, (limit.maxHeightMm - print.heightMm * scale) / 2 - 1e-6);
  return {
    widthMm: print.widthMm,
    heightMm: print.heightMm,
    scale,
    offsetX: truncate01(clamp(print.offsetX, -maxOffsetX, maxOffsetX)) || 0,
    offsetY: truncate01(clamp(print.offsetY, -maxOffsetY, maxOffsetY)) || 0,
  };
}

export function isWithinArea(print: PrintGeometry, limit: PlacementLimit): boolean {
  const w = print.widthMm * print.scale;
  const h = print.heightMm * print.scale;
  return (
    Math.abs(print.offsetX) + w / 2 <= limit.maxWidthMm / 2 &&
    Math.abs(print.offsetY) + h / 2 <= limit.maxHeightMm / 2
  );
}

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function areaRect(placement: PrintPlacement): CanvasRect {
  const anchor = PLACEMENT_ANCHORS[placement];
  const limit = PLACEMENT_LIMITS[placement];
  return {
    x: anchor.x - limit.maxWidthMm / 2,
    y: anchor.y - limit.maxHeightMm / 2,
    width: limit.maxWidthMm,
    height: limit.maxHeightMm,
  };
}

export function calculatePosition(print: PrintGeometry, placement: PrintPlacement): CanvasRect {
  const anchor = PLACEMENT_ANCHORS[placement];
  const width = print.widthMm * print.scale;
  const height = print.heightMm * print.scale;
  return {
    x: anchor.x + print.offsetX - width / 2,
    y: anchor.y + print.offsetY - height / 2,
    width,
    height,
  };
}

export function fitToArea(
  aspect: number,
  limit: PlacementLimit,
  fill = 0.6,
): { widthMm: number; heightMm: number } {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  let width = limit.maxWidthMm * fill;
  let height = width / safeAspect;
  if (height > limit.maxHeightMm * fill) {
    height = limit.maxHeightMm * fill;
    width = height * safeAspect;
  }
  return { widthMm: round1(width), heightMm: round1(height) };
}

const RATE_PER_CM2: Record<PrintTechnology, number> = {
  DTG: 0.25,
  DTF: 0.2,
  EMBROIDERY: 0.6,
  SUBLIMATION: 0.15,
};
const MIN_PRINT_COST = 15;

export function estimatePrintCost(print: PrintGeometry, technology: PrintTechnology): number {
  const areaCm2 = ((print.widthMm * print.scale) / 10) * ((print.heightMm * print.scale) / 10);
  return Math.round(Math.max(MIN_PRINT_COST, areaCm2 * RATE_PER_CM2[technology]) * 100) / 100;
}

export function viewOf(placement: PrintPlacement): 'front' | 'back' {
  return placement === 'BACK' ? 'back' : 'front';
}
