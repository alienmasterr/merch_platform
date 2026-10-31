import { describe, expect, it } from 'vitest';
import { PrintTechnology, ValidationError } from '@merch/contracts';
import { PrintConfiguration } from '../domain/print-configuration';
import { makePrint, printData } from './helpers';

describe('PrintConfiguration', () => {
  describe('validateBounds', () => {
    it('принт по центру в межах зони проходить', () => {
      expect(makePrint({ widthMm: 300, heightMm: 400 }).validateBounds(300, 400)).toBe(true);
    });

    it('масштаб враховується: 200x200 при scale 2 не влізає в 300x300', () => {
      expect(makePrint({ scale: 2 }).validateBounds(300, 300)).toBe(false);
      expect(makePrint({ scale: 1.5 }).validateBounds(300, 300)).toBe(true);
    });

    it('зміщення виштовхує принт за межі', () => {
      expect(makePrint({ offsetX: 60 }).validateBounds(300, 300)).toBe(false);
      expect(makePrint({ offsetX: 50, offsetY: -50 }).validateBounds(300, 300)).toBe(true);
    });
  });

  describe('validateFileFormat', () => {
    const cfg = makePrint();
    it('дозволені формати проходять, регістр і крапка не важливі', () => {
      for (const ext of ['png', 'JPG', '.jpeg', 'webp', 'svg']) {
        expect(cfg.validateFileFormat(ext, 1000)).toBe(true);
      }
    });

    it('негатив: чужий формат, нульовий і завеликий файл', () => {
      expect(cfg.validateFileFormat('exe', 1000)).toBe(false);
      expect(cfg.validateFileFormat('png', 0)).toBe(false);
      expect(cfg.validateFileFormat('png', 20 * 1024 * 1024 + 1)).toBe(false);
    });
  });

  describe('calculatePrintCost', () => {
    it('рахує за площею й технологією', () => {
      expect(makePrint().calculatePrintCost()).toBe(100);
      expect(makePrint({ technology: PrintTechnology.EMBROIDERY }).calculatePrintCost()).toBe(240);
    });

    it('мінімальна вартість друку 15 грн', () => {
      expect(makePrint({ widthMm: 10, heightMm: 10 }).calculatePrintCost()).toBe(15);
    });

    it('масштаб збільшує площу', () => {
      expect(makePrint({ scale: 0.5 }).calculatePrintCost()).toBe(25);
    });
  });

  describe('валідація конструктора', () => {
    it('негатив: некоректні значення кидають ValidationError', () => {
      const bad = [
        { printFileUrl: '  ' },
        { widthMm: 0 },
        { heightMm: -1 },
        { scale: 0 },
        { offsetX: Number.NaN },
        { placement: 'NOWHERE' as never },
        { technology: 'LASER' as never },
      ];
      for (const override of bad) {
        expect(() => new PrintConfiguration(printData(override))).toThrow(ValidationError);
      }
    });

    it('toData повертає ті самі значення', () => {
      const data = printData({ offsetX: 5 });
      expect(makePrint({ offsetX: 5 }).toData()).toEqual(data);
    });

    it('getPlacement і getTechnology', () => {
      const cfg = makePrint();
      expect(cfg.getPlacement()).toBe('CHEST');
      expect(cfg.getTechnology()).toBe('DTG');
    });
  });
});
