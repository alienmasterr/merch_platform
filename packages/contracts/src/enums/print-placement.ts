export const PrintPlacement = {
  CHEST: 'CHEST',
  BACK: 'BACK',
  LEFT_LEG: 'LEFT_LEG',
  RIGHT_LEG: 'RIGHT_LEG',
  SLEEVE: 'SLEEVE',
  ACCESSORY_FRONT: 'ACCESSORY_FRONT',
} as const;

export type PrintPlacement = (typeof PrintPlacement)[keyof typeof PrintPlacement];

export const PRINT_PLACEMENTS = Object.values(PrintPlacement);
