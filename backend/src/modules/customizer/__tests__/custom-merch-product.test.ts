import { describe, expect, it } from 'vitest';
import { ValidationError } from '@merch/contracts';
import { CustomMerchProduct } from '../domain/custom-merch-product';
import { makeHoodie } from '../../../test-utils/fixtures';
import { makePrint } from './helpers';

describe('CustomMerchProduct', () => {
  const make = () => new CustomMerchProduct({ id: 'p1', baseItem: makeHoodie(), printConfigs: [makePrint()] });

  it('getTotalCost: 900 + 90 + 100', () => {
    expect(make().getTotalCost()).toBe(1090);
  });

  it('approval за замовчуванням false, setApprovalStatus змінює', () => {
    const p = make();
    expect(p.isMockupApproved()).toBe(false);
    p.setApprovalStatus(true);
    expect(p.isMockupApproved()).toBe(true);
  });

  it("setPreviewImageUrl зберігає URL, а порожній URL відхиляється", () => {
    const p = make();
    p.setPreviewImageUrl('http://x/y.svg');
    expect(p.getPreviewImageUrl()).toBe('http://x/y.svg');
    expect(() => p.setPreviewImageUrl(' ')).toThrow(ValidationError);
  });

  it('getPrintConfigs повертає копію', () => {
    const p = make();
    p.getPrintConfigs().pop();
    expect(p.getPrintConfigs()).toHaveLength(1);
  });
});
