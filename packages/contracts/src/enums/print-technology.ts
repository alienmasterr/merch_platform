export const PrintTechnology = {
  DTG: 'DTG',
  DTF: 'DTF',
  EMBROIDERY: 'EMBROIDERY',
  SUBLIMATION: 'SUBLIMATION',
} as const;

export type PrintTechnology = (typeof PrintTechnology)[keyof typeof PrintTechnology];

export const PRINT_TECHNOLOGIES = Object.values(PrintTechnology);
