import { describe, expect, it } from 'vitest';
import { PrintPlacement, ValidationError } from '@merch/contracts';
import { makeHoodie, makeMug, makePants, makeTee } from '../../../test-utils/fixtures';

describe('MerchApparelItem hierarchy (поліморфізм, LSP)', () => {
  it('TopWearItem: вартість залежить від капюшона й кишень', () => {
    expect(makeTee().calculateProductionCost()).toBe(50);
    expect(makeHoodie().calculateProductionCost()).toBe(90);
  });

  it('TopWearItem: дозволені зони нанесення', () => {
    expect(makeTee().getAllowedPlacements()).toEqual([
      PrintPlacement.CHEST, PrintPlacement.BACK, PrintPlacement.SLEEVE,
    ]);
  });

  it('BottomWearItem: довгі штани дорожчі, зони лише на ногах', () => {
    expect(makePants(100).calculateProductionCost()).toBe(40);
    expect(makePants(105).calculateProductionCost()).toBe(50);
    expect(makePants().getAllowedPlacements()).toEqual([PrintPlacement.LEFT_LEG, PrintPlacement.RIGHT_LEG]);
  });

  it('AccessoryItem: фіксована вартість і одна зона', () => {
    expect(makeMug().calculateProductionCost()).toBe(20);
    expect(makeMug().getAllowedPlacements()).toEqual([PrintPlacement.ACCESSORY_FRONT]);
  });

  it('усі нащадки взаємозамінні через базовий тип', () => {
    for (const item of [makeTee(), makeHoodie(), makePants(), makeMug()]) {
      expect(item.calculateProductionCost()).toBeGreaterThan(0);
      expect(item.getAllowedPlacements().length).toBeGreaterThan(0);
    }
  });

  it('setBasePrice змінює ціну', () => {
    const tee = makeTee();
    tee.setBasePrice(450);
    expect(tee.getBasePrice()).toBe(450);
  });

  it('негатив: мінусова або нескінченна ціна відхиляється', () => {
    const tee = makeTee();
    expect(() => tee.setBasePrice(-1)).toThrow(ValidationError);
    expect(() => tee.setBasePrice(Number.POSITIVE_INFINITY)).toThrow(ValidationError);
    expect(() => makeTee({ basePrice: -5 })).toThrow(ValidationError);
  });

  it('setInStock перемикає наявність', () => {
    const tee = makeTee();
    tee.setInStock(false);
    expect(tee.isInStock()).toBe(false);
  });
});
