import { PrintPlacement, PrintTechnology, type PrintConfigurationData } from '@merch/contracts';
import { PrintConfiguration } from '../domain/print-configuration';

export function printData(overrides: Partial<PrintConfigurationData> = {}): PrintConfigurationData {
  return {
    printFileUrl: 'http://memory.local/prints/logo.png',
    placement: PrintPlacement.CHEST,
    technology: PrintTechnology.DTG,
    widthMm: 200,
    heightMm: 200,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    ...overrides,
  };
}

export function makePrint(overrides: Partial<PrintConfigurationData> = {}): PrintConfiguration {
  return new PrintConfiguration(printData(overrides));
}
