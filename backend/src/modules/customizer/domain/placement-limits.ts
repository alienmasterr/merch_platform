import { PrintPlacement } from '@merch/contracts';

export interface PlacementLimit {
  maxWidthMm: number;
  maxHeightMm: number;
}

/** Максимальна область друку для кожної зони (мм). */
export const PLACEMENT_LIMITS: Record<PrintPlacement, PlacementLimit> = {
  [PrintPlacement.CHEST]: { maxWidthMm: 300, maxHeightMm: 400 },
  [PrintPlacement.BACK]: { maxWidthMm: 350, maxHeightMm: 450 },
  [PrintPlacement.SLEEVE]: { maxWidthMm: 100, maxHeightMm: 100 },
  [PrintPlacement.LEFT_LEG]: { maxWidthMm: 150, maxHeightMm: 300 },
  [PrintPlacement.RIGHT_LEG]: { maxWidthMm: 150, maxHeightMm: 300 },
  [PrintPlacement.ACCESSORY_FRONT]: { maxWidthMm: 200, maxHeightMm: 200 },
};
