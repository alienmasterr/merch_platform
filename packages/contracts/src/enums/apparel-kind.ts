export const ApparelKind = {
  TOP: 'TOP',
  BOTTOM: 'BOTTOM',
  ACCESSORY: 'ACCESSORY',
} as const;

export type ApparelKind = (typeof ApparelKind)[keyof typeof ApparelKind];
